// Keeps one Harvard Dataverse dataset per country in line with the files on its website (owner, 14 Nov 2026).
// Weekly GitHub Action; needs the API token in DATAVERSE_TOKEN (GitHub secret HARVARD). DRY_RUN=1 only reports.
// First run: creates and publishes the collection in dataverse.json, then each country's dataset (metadata, licence,
// every file), published as version 1.0. Later runs: replaces changed files, adds new ones, removes gone ones and
// publishes a new major version, only for a country whose files changed. A volatile file (the Laos timetable,
// rewritten every morning) is replaced with the others but never triggers a version on its own.
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { loadManifest, download } from './manifest.mjs';

const cfg = JSON.parse(readFileSync(new URL('../dataverse.json', import.meta.url), 'utf8'));
const API = cfg.server + '/api';
const TOKEN = process.env.DATAVERSE_TOKEN;
const DRY = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
if (!TOKEN && !DRY) throw new Error('DATAVERSE_TOKEN is not set (or run with DRY_RUN=1).');

async function api(method, path, body) {
  const headers = { 'User-Agent': 'southeast-asia-transport-data (+https://github.com/laosbustickets/southeast-asia-transport-data)' };
  if (TOKEN) headers['X-Dataverse-key'] = TOKEN;
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(API + path, { method, headers, body: payload });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) { const e = new Error(`${method} ${path.split('?')[0]}: HTTP ${r.status} ${(typeof json === 'string' ? json : JSON.stringify(json)).slice(0, 300)}`); e.status = r.status; throw e; }
  return json.data ?? json;
}

/* Files are stored as they are on the site: no tabular ingest (a CSV would become a .tab with another checksum). */
function filePart(f, extra = {}) {
  const fd = new FormData();
  fd.append('file', new Blob([f.buf]), f.key);
  const dir = f.path.split('/').slice(1, -1).join('/');
  fd.append('jsonData', JSON.stringify({ tabIngest: false, ...(dir ? { directoryLabel: dir } : {}), ...extra }));
  return fd;
}

async function waitUnlocked(pid) {
  for (let i = 0; i < 60; i++) {
    const locks = await api('GET', `/datasets/:persistentId/locks?persistentId=${pid}`).catch(() => []);
    if (!locks.length) return;
    await sleep(5000);
  }
  throw new Error(`${pid} still locked after 5 minutes`);
}

const field = (typeName, typeClass, multiple, value) => ({ typeName, typeClass, multiple, value });
function citation(d, meta) {
  const fields = [
    field('title', 'primitive', false, meta.title),
    field('author', 'compound', true, [{ authorName: field('authorName', 'primitive', false, d.siteName) }]),
    field('datasetContact', 'compound', true, [{ datasetContactName: field('datasetContactName', 'primitive', false, d.siteName), datasetContactEmail: field('datasetContactEmail', 'primitive', false, 'contact@' + new URL(d.site).hostname) }]),
    field('dsDescription', 'compound', true, [{ dsDescriptionValue: field('dsDescriptionValue', 'primitive', false, d.description) }]),
    field('subject', 'controlledVocabulary', true, ['Earth and Environmental Sciences', 'Social Sciences']),
    field('keyword', 'compound', true, meta.keywords.map((k) => ({ keywordValue: field('keywordValue', 'primitive', false, k) }))),
    field('otherId', 'compound', true, [{ otherIdAgency: field('otherIdAgency', 'primitive', false, 'Zenodo (all versions)'), otherIdValue: field('otherIdValue', 'primitive', false, 'doi:' + d.zenodo.conceptDoi) }]),
    field('productionPlace', 'primitive', true, [d.name]),
    field('distributor', 'compound', true, [{ distributorName: field('distributorName', 'primitive', false, d.siteName), distributorURL: field('distributorURL', 'primitive', false, d.dataPage || d.site) }])
  ];
  return fields;
}
const licence = (d) => /^CC BY 4\.0/.test(d.license)
  ? { name: 'CC BY 4.0', uri: 'http://creativecommons.org/licenses/by/4.0' }
  : { name: 'ODbL 1.0', uri: 'https://opendatacommons.org/licenses/odbl/1-0' };

/* 1. The collection. */
const alias = cfg.collection.alias;
let collection = await api('GET', `/dataverses/${alias}`).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
if (!collection) {
  say(`collection ${alias}: not found, ${DRY ? 'would create' : 'creating'} it under ${cfg.parent}`);
  if (!DRY) {
    collection = await api('POST', `/dataverses/${cfg.parent}`, {
      alias, name: cfg.collection.name, affiliation: cfg.collection.affiliation, description: cfg.collection.description,
      dataverseType: 'RESEARCH_PROJECTS', dataverseContacts: [{ contactEmail: cfg.collection.contactEmail }]
    });
  }
}
if (collection && !collection.isReleased && !DRY) { await api('POST', `/dataverses/${alias}/actions/:publish`); say(`collection ${alias}: published`); }
const contents = collection ? await api('GET', `/dataverses/${alias}/contents`) : [];
const existing = {};
for (const c of contents.filter((c) => c.type === 'dataset')) {
  const pid = `${c.protocol}:${c.authority}/${c.identifier}`;
  const v = await api('GET', `/datasets/:persistentId/versions/:latest?persistentId=${pid}`);
  const title = v.metadataBlocks.citation.fields.find((f) => f.typeName === 'title').value;
  existing[title] = { pid, version: v, files: v.files || [] };
}

/* 2. One dataset per country. */
let failures = 0;
for (const d of loadManifest().datasets) {
  const meta = cfg.datasets[d.id];
  if (!meta) { say(`${d.id}: not in dataverse.json, skipped`); continue; }
  try {
    const local = [];
    for (const f of d.allFiles) { const buf = await download(f.url); local.push({ ...f, buf, md5: md5(buf) }); }
    const ds = existing[meta.title];
    if (!ds) {
      say(`${d.id}: no dataset yet, ${DRY ? 'would create' : 'creating'} "${meta.title}" with ${local.length} files`);
      if (DRY) continue;
      const created = await api('POST', `/dataverses/${alias}/datasets`, { datasetVersion: { license: licence(d), metadataBlocks: { citation: { fields: citation(d, meta) } } } });
      const pid = created.persistentId;
      for (const f of local) { await api('POST', `/datasets/:persistentId/add?persistentId=${pid}`, filePart(f)); }
      await waitUnlocked(pid);
      await api('POST', `/datasets/:persistentId/actions/:publish?persistentId=${pid}&type=major`);
      say(`${d.id}: published ${pid} (https://doi.org/${pid.replace(/^doi:/, '')})`);
      continue;
    }
    const remote = Object.fromEntries(ds.files.map((x) => [x.dataFile.filename, x.dataFile]));
    const changed = local.filter((f) => remote[f.key] && remote[f.key].md5 !== f.md5);
    const added = local.filter((f) => !remote[f.key]);
    const gone = Object.keys(remote).filter((k) => !local.some((f) => f.key === k));
    const real = [...changed.filter((f) => !f.volatile), ...added];
    if (!real.length && !gone.length) { say(`${d.id}: unchanged since version ${ds.version.versionNumber}.${ds.version.versionMinorNumber} (${ds.pid})`); continue; }
    say(`${d.id}: ${changed.length} changed, ${added.length} new, ${gone.length} removed (${[...changed, ...added].map((f) => f.key).concat(gone).slice(0, 6).join(', ')})`);
    if (DRY) continue;
    for (const f of changed) await api('POST', `/files/${remote[f.key].id}/replace`, filePart(f, { forceReplace: true }));
    for (const f of added) await api('POST', `/datasets/:persistentId/add?persistentId=${ds.pid}`, filePart(f));
    if (gone.length) {
      /* Ids change when a draft is created, so read the draft's file list before deleting. */
      const draft = await api('GET', `/datasets/:persistentId/versions/:draft/files?persistentId=${ds.pid}`).catch(() => ds.files);
      for (const x of draft.filter((x) => gone.includes(x.dataFile.filename))) await api('DELETE', `/files/${x.dataFile.id}`);
    }
    await waitUnlocked(ds.pid);
    await api('POST', `/datasets/:persistentId/actions/:publish?persistentId=${ds.pid}&type=major`);
    say(`${d.id}: published a new version of ${ds.pid}`);
  } catch (e) {
    failures++;
    say(`${d.id}: FAILED ${e.message}`);
  }
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Harvard Dataverse${DRY ? ' (dry run)' : ''}\n\n${log.map((l) => `- ${l}`).join('\n')}\n`);
if (failures) process.exit(1);
