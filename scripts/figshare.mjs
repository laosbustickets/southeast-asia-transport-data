// Keeps the five Figshare map items current (weekly GitHub Action, after the sites' weekly updates).
// For each item in figshare.json: downloads the live English SVG map, compares it and the item's
// title, description, keywords, categories and related materials with the latest public version,
// and when anything differs, updates the item and publishes it. A new map (SVG + a PNG rendered from
// it) makes a new version (DOI .vN); a text-only change updates the current version in place.
//
// Env: FIGSHARE_TOKEN (personal token, figshare.com > Integrations), DRY_RUN=1 (report only, no token
// needed), CREATE=1 (create items whose articleId is null; print their new ids for figshare.json),
// ONLY=laos,thailand (limit to some items), PLAYWRIGHT_MODULE (path to playwright if not installed here).
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const API = 'https://api.figshare.com/v2';
const TOKEN = process.env.FIGSHARE_TOKEN;
const DRY = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const CREATE = process.env.CREATE === '1';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const UA = 'southeast-asia-transport-data (+https://github.com/laosbustickets/southeast-asia-transport-data)';
const cfg = JSON.parse(readFileSync(process.env.FIGSHARE_CONFIG || new URL('../figshare.json', import.meta.url), 'utf8'));
const log = [];
const say = (s) => { console.log(s); log.push(s); };
if (!TOKEN && !DRY) throw new Error('FIGSHARE_TOKEN is not set (or run with DRY_RUN=1).');

async function api(method, path, body, { auth = true, raw = false } = {}) {
  const headers = { 'User-Agent': UA, Accept: 'application/json' };
  if (auth && TOKEN) headers.Authorization = `token ${TOKEN}`;
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  const url = path.startsWith('http') ? path : API + path;
  for (let i = 1; ; i++) {
    const r = await fetch(url, { method, headers, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
    const text = await r.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (r.ok) return json;
    if (r.status === 404 && method === 'GET') return null;
    if (r.status >= 500 && i < 3) { await new Promise((ok) => setTimeout(ok, 5000 * i)); continue; }
    throw new Error(`${method} ${url.replace(API, '')}: HTTP ${r.status} ${String(typeof json === 'string' ? json : JSON.stringify(json)).slice(0, 300)}`);
  }
}

async function download(url) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i >= 3) throw new Error(`${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 5000 * i));
    }
  }
}

const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
/* Plain-text URLs in a description paragraph become real links (Figshare keeps <a href>). */
const linkify = (p) => esc(p).replace(/https?:\/\/[^\s<]+[^\s<.,;:)]/g, (u) => `<a href="${u}">${u}</a>`);
const relKey = (r) => `${r.identifier}|${r.title || ''}|${r.identifier_type}|${r.relation || 'IsSupplementTo'}|${!!r.is_linkout}`;
const related = (item) => item.related.map((r) => ({ relation: 'IsSupplementTo', is_linkout: false, ...r }));

function metadata(item) {
  return {
    title: item.title,
    description: item.description.map((p) => `<p>${linkify(p)}</p>`).join(''),
    keywords: item.keywords,
    categories: cfg.categories,
    license: cfg.license,
    defined_type: 'figure',
    related_materials: related(item),
    references: item.related.map((r) => (r.identifier_type === 'DOI' ? `https://doi.org/${r.identifier}` : r.identifier))
  };
}

/* What differs between the wanted item and the latest public version (null = never published). */
function differences(item, pub, svgMd5) {
  if (!pub) return ['not published yet'];
  const d = [];
  if (pub.title !== item.title) d.push('title');
  if (text(pub.description) !== text(metadata(item).description) || ((pub.description || '').match(/<a /g) || []).length !== (metadata(item).description.match(/<a /g) || []).length) d.push('description');
  if (JSON.stringify(pub.references || []) !== JSON.stringify(metadata(item).references)) d.push('references');
  if (JSON.stringify(pub.tags || pub.keywords) !== JSON.stringify(item.keywords)) d.push('keywords');
  if (JSON.stringify((pub.categories || []).map((c) => c.id).sort()) !== JSON.stringify([...cfg.categories].sort())) d.push('categories');
  if ((pub.license || {}).value !== cfg.license) d.push('licence');
  if (JSON.stringify((pub.related_materials || []).map(relKey).sort()) !== JSON.stringify(related(item).map(relKey).sort())) d.push('related materials');
  const files = pub.files || [];
  const svgName = item.svgUrl.split('/').pop();
  const svg = files.find((f) => f.name === svgName);
  if (!svg || svg.computed_md5 !== svgMd5) d.push('map');
  if (files.length !== 2 || !files.some((f) => f.name === svgName.replace(/\.svg$/, '.png'))) d.push('file set');
  return d;
}

let browser;
async function renderPng(svg, width) {
  if (!browser) {
    const mod = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright';
    const { chromium } = await import(mod);
    browser = await chromium.launch();
  }
  const m = /viewBox="([\d.\s-]+)"/.exec(svg.toString('utf8', 0, 2000));
  const [, , vw, vh] = m[1].trim().split(/\s+/).map(Number);
  const height = Math.round((width * vh) / vw);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff"><img id="m" style="display:block;width:${width}px;height:${height}px" src="data:image/svg+xml;base64,${svg.toString('base64')}"></body></html>`);
  await page.evaluate(async () => { const i = document.getElementById('m'); await i.decode(); await document.fonts.ready; });
  await page.waitForTimeout(500);
  const png = await page.locator('#m').screenshot({ type: 'png' });
  await page.close();
  return png;
}

/* A site that answers with an error page, an empty file or a half-written map must never replace a good map. */
function checkSvg(svg, item, pub) {
  const head = svg.toString('utf8', 0, 3000);
  if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(head) || !/viewBox="[\d.\s-]+"/.test(head)) throw new Error(`${item.svgUrl} is not an SVG map`);
  if (!/<\/svg>\s*$/.test(svg.toString('utf8', Math.max(0, svg.length - 200)))) throw new Error(`${item.svgUrl} is cut off (no closing </svg>)`);
  const old = (pub?.files || []).find((f) => f.name.endsWith('.svg'));
  if (svg.length < 30000 || (old && svg.length < old.size * 0.5)) throw new Error(`${item.svgUrl} is ${svg.length} bytes, much smaller than the published map (${old?.size ?? 'none'}): not published`);
}

async function upload(articleId, name, buf) {
  const { location } = await api('POST', `/account/articles/${articleId}/files`, { name, size: buf.length, md5: md5(buf) });
  const file = await api('GET', location);
  const { parts } = await api('GET', file.upload_url, undefined, { auth: false });
  for (const p of parts) await api('PUT', `${file.upload_url}/${p.partNo}`, buf.subarray(p.startOffset, p.endOffset + 1), { auth: false, raw: true });
  await api('POST', `/account/articles/${articleId}/files/${file.id}`);
  return file.id;
}

/* Check the token every run, so an expired or wrong secret fails the job even in a week with no change. */
if (TOKEN) {
  const me = await api('GET', '/account').catch((e) => { throw new Error(`FIGSHARE_TOKEN rejected: ${e.message}`); });
  if (!me?.id) throw new Error('FIGSHARE_TOKEN rejected: no account');
}

let failures = 0;
for (const item of cfg.items) {
  if (ONLY.length && !ONLY.includes(item.id)) continue;
  try {
    const svg = await download(item.svgUrl);
    const svgName = item.svgUrl.split('/').pop();
    const pngName = svgName.replace(/\.svg$/, '.png');
    let id = item.articleId;
    if (!id) {
      if (!CREATE) { say(`${item.id}: no Figshare item yet, skipped (run once with CREATE=1)`); continue; }
      if (DRY) { say(`${item.id}: would be created`); continue; }
      const { entity_id } = await api('POST', '/account/articles', metadata(item));
      id = entity_id;
      await api('PUT', `/account/articles/${id}/authors`, { authors: cfg.authors });
      say(`${item.id}: created item ${id} (write it into figshare.json)`);
    }
    const pub = await api('GET', `/articles/${id}`, undefined, { auth: false });
    checkSvg(svg, item, pub);
    const diff = differences(item, pub, md5(svg));
    if (!diff.length) { say(`${item.id}: unchanged (version ${pub.version}, ${pub.doi})`); continue; }
    say(`${item.id}: ${diff.join(', ')} changed`);
    if (DRY) continue;

    await api('PUT', `/account/articles/${id}`, metadata(item));
    const priv = await api('GET', `/account/articles/${id}`);
    const files = priv.files || [];
    const keep = files.find((f) => f.name === svgName && f.computed_md5 === md5(svg));
    const pngOk = keep && files.some((f) => f.name === pngName);
    if (!keep || !pngOk || files.length !== 2) {
      /* Render first: if Chromium fails, the item is left untouched. */
      const png = await renderPng(svg, cfg.pngWidth);
      if (png.length < 100000) throw new Error(`PNG render is only ${png.length} bytes`);
      for (const f of files) await api('DELETE', `/account/articles/${id}/files/${f.id}`);
      await upload(id, svgName, svg);
      await upload(id, pngName, png);
      const after = (await api('GET', `/account/articles/${id}`)).files || [];
      const svgUp = after.find((f) => f.name === svgName);
      if (after.length !== 2 || !svgUp || (svgUp.computed_md5 || svgUp.supplied_md5) !== md5(svg)) throw new Error(`upload check failed (${after.map((f) => `${f.name}:${f.computed_md5}`).join(', ')}), not published`);
    }
    await api('POST', `/account/articles/${id}/publish`);
    const now = await api('GET', `/articles/${id}`, undefined, { auth: false });
    say(`${item.id}: published version ${now?.version}, https://doi.org/${now?.doi || `10.6084/m9.figshare.${id}`}`);
  } catch (e) {
    failures++;
    say(`${item.id}: FAILED ${e.message}`);
  }
}
if (browser) await browser.close();
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Figshare${DRY ? ' (dry run)' : ''}\n\n${log.map((l) => `- ${l}`).join('\n')}\n`);
if (failures) process.exit(1);
