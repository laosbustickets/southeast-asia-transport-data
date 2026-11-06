// Keeps the transport maps on Wikimedia Commons current (weekly GitHub Action) and does first uploads.
// For each file in commons.json: downloads the live SVG, and when its md5 differs from the one recorded
// in the latest upload comment ("svg-md5:<hash>"), renders a PNG and uploads it as a new version of
// the same file (same name, so every wiki page using it shows the current map).
// A file that does not exist yet is uploaded with its page text from commons.json (or from PAGES_DIR).
//
// Env: COMMONS_BOT_USER ("Bounmee69@seatransport"), COMMONS_BOT_PASSWORD (Special:BotPasswords),
// DRY_RUN=1 (report only), ONLY=<substring of a file name>, PNG_DIR (use ready PNGs instead of rendering),
// PAGES_DIR (page texts for first uploads), PLAYWRIGHT_MODULE (path to playwright if not installed here).
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'SEATransportMapUpdater/1.0 (https://github.com/laosbustickets/southeast-asia-transport-data; User:Bounmee69)';
const DRY = process.env.DRY_RUN === '1';
const ONLY = process.env.ONLY || '';
const cfg = JSON.parse(readFileSync(process.env.COMMONS_CONFIG || new URL('../commons.json', import.meta.url), 'utf8'));
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const md5 = (b) => createHash('md5').update(b).digest('hex');
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

let cookies = {};
async function call(params, { post = false, form } = {}) {
  const headers = { 'User-Agent': UA, Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') };
  const q = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const r = await fetch(post ? API : `${API}?${q}`, { method: post ? 'POST' : 'GET', headers, body: post ? (form || q) : undefined });
  for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
  const j = await r.json();
  if (j.error) throw new Error(`${params.action}: ${j.error.code} ${j.error.info}`);
  return j;
}

async function login() {
  const user = process.env.COMMONS_BOT_USER, pass = process.env.COMMONS_BOT_PASSWORD;
  if (!user || !pass) throw new Error('COMMONS_BOT_USER / COMMONS_BOT_PASSWORD not set (or run with DRY_RUN=1).');
  const t = await call({ action: 'query', meta: 'tokens', type: 'login' });
  const l = await call({ action: 'login', lgname: user, lgpassword: pass, lgtoken: t.query.tokens.logintoken }, { post: true });
  if (l.login.result !== 'Success') throw new Error(`login failed: ${l.login.result} ${l.login.reason || ''}`);
  return (await call({ action: 'query', meta: 'tokens' })).query.tokens.csrftoken;
}

async function download(url) {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (i >= 3) throw new Error(`${url}: ${e.message}`); await sleep(5000 * i); }
  }
}

function checkSvg(svg, url) {
  const head = svg.toString('utf8', 0, 3000);
  if (!/<svg[\s>]/.test(head) || !/viewBox="[\d.\s-]+"/.test(head)) throw new Error(`${url} is not an SVG map`);
  if (!/<\/svg>\s*$/.test(svg.toString('utf8', Math.max(0, svg.length - 200)))) throw new Error(`${url} is cut off`);
  if (svg.length < 30000) throw new Error(`${url} is only ${svg.length} bytes`);
}

let browser;
async function renderPng(svg, width = 2200) {
  if (!browser) {
    const mod = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright';
    browser = await (await import(mod)).chromium.launch();
  }
  const [, , vw, vh] = /viewBox="([\d.\s-]+)"/.exec(svg.toString('utf8', 0, 3000))[1].trim().split(/\s+/).map(Number);
  const height = Math.round((width * vh) / vw);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff"><img id="m" style="display:block;width:${width}px;height:${height}px" src="data:image/svg+xml;base64,${svg.toString('base64')}"></body></html>`);
  await page.evaluate(async () => { await document.getElementById('m').decode(); await document.fonts.ready; });
  await page.waitForTimeout(500);
  const png = await page.locator('#m').screenshot({ type: 'png' });
  await page.close();
  if (png.length < 100000) throw new Error(`PNG render only ${png.length} bytes`);
  return png;
}

let failures = 0, token = null;
for (const f of cfg.files) {
  if (ONLY && !f.title.includes(ONLY)) continue;
  try {
    const svg = await download(f.svgUrl);
    checkSvg(svg, f.svgUrl);
    const hash = md5(svg);
    /* POST: Commons can serve a cached GET answer that still shows the previous version. */
    const info = await call({ action: 'query', titles: `File:${f.title}`, prop: 'imageinfo', iiprop: 'comment|timestamp', iilimit: 1 }, { post: true });
    const page = info.query.pages[0];
    const exists = !page.missing;
    const last = exists ? page.imageinfo?.[0]?.comment || '' : '';
    if (exists && last.includes(`svg-md5:${hash}`)) { say(`${f.title}: unchanged`); continue; }
    if (exists && !f.update) { say(`${f.title}: map changed, updates off for this file`); continue; }
    const pageFile = !exists && process.env.PAGES_DIR && f.page ? join(process.env.PAGES_DIR, f.page) : null;
    if (!exists && !(pageFile && existsSync(pageFile)) && !f.text) { say(`${f.title}: not on Commons yet and no page text, skipped (first upload is done by hand)`); continue; }
    say(`${f.title}: ${exists ? 'map changed, new version' : 'new file'}`);
    if (DRY) continue;
    const local = process.env.PNG_DIR && join(process.env.PNG_DIR, f.title);
    const png = local && existsSync(local) && !exists ? readFileSync(local) : await renderPng(svg);
    if (!token) token = await login();
    const form = new FormData();
    const text = exists ? null : (pageFile && existsSync(pageFile) ? readFileSync(pageFile, 'utf8') : f.text);
    const fields = { action: 'upload', format: 'json', formatversion: '2', filename: f.title, token,
      comment: `${exists ? 'Update' : 'Upload'} from ${f.svgUrl} (svg-md5:${hash})`, ...(exists ? { ignorewarnings: '1' } : { text }) };
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append('file', new Blob([png], { type: 'image/png' }), f.title);
    let r;
    try { r = await call({ action: 'upload' }, { post: true, form }); }
    catch (e) {
      /* The rendered PNG is identical to the current version: nothing to publish. */
      if (/fileexists-no-change|duplicate/.test(e.message)) { say(`${f.title}: same image as the current version, nothing to upload`); continue; }
      throw e;
    }
    if (r.upload?.result !== 'Success') throw new Error(`upload: ${JSON.stringify(r.upload).slice(0, 300)}`);
    say(`${f.title}: uploaded (${png.length} bytes)`);
    await sleep(3000);
  } catch (e) { failures++; say(`${f.title}: FAILED ${e.message}`); }
}
if (browser) await browser.close();
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Commons${DRY ? ' (dry run)' : ''}\n\n${log.map((l) => `- ${l}`).join('\n')}\n`);
if (failures) process.exit(1);
