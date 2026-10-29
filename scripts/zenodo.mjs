// Publishes a new Zenodo version of a country's record when one of its files changed on the website.
// Weekly GitHub Action. Needs ZENODO_TOKEN (personal access token with deposit:write and deposit:actions).
// DRY_RUN=1 only reports what would change. A file marked volatile in datasets.json (the Laos
// timetable, rewritten every morning) is archived with each new version but never triggers one.
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { loadManifest, download } from './manifest.mjs';

const API = 'https://zenodo.org/api';
const TOKEN = process.env.ZENODO_TOKEN;
const DRY = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const today = new Date().toISOString().slice(0, 10);
const log = [];
const say = (s) => { console.log(s); log.push(s); };

async function api(method, path, body, type = 'application/json') {
  /* Zenodo turns away requests without a User-Agent (HTTP 403). */
  /* Record and draft endpoints answer in the InvenioRDM format; file endpoints only in plain JSON. */
  const accept = path.includes('/files') ? 'application/json' : 'application/vnd.inveniordm.v1+json';
  const headers = { Accept: accept, 'User-Agent': 'southeast-asia-transport-data (+https://github.com/laosbustickets/southeast-asia-transport-data)' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (body !== undefined) headers['Content-Type'] = type;
  const r = await fetch(API + path, { method, headers, body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body });
  const text = await r.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!r.ok) throw new Error(`${method} ${path}: HTTP ${r.status} ${typeof json === 'string' ? json.slice(0, 300) : JSON.stringify(json).slice(0, 300)}`);
  return json;
}

const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const vocab = (x) => (x && x.id ? { id: x.id } : x);

/* The draft comes back in the API's display form (titles, icons, props); a PUT accepts only ids. */
function cleanMetadata(md, d, versionDois) {
  const related = (md.related_identifiers || []).map((r) => ({
    identifier: r.scheme === 'doi' && versionDois[r.identifier] ? versionDois[r.identifier] : r.identifier,
    scheme: r.scheme, relation_type: vocab(r.relation_type), ...(r.resource_type ? { resource_type: vocab(r.resource_type) } : {})
  }));
  return {
    ...md,
    resource_type: vocab(md.resource_type),
    rights: d.zenodo.rights ? d.zenodo.rights.map((id) => ({ id })) : (md.rights || []).map((r) => (r.id ? { id: r.id } : r)),
    languages: (md.languages || []).map(vocab),
    subjects: (md.subjects || []).map((s) => (s.id ? { id: s.id } : { subject: s.subject })),
    related_identifiers: related,
    description: d.description,
    version: today,
    publication_date: today,
    dates: [{ date: today, type: { id: 'collected' }, description: 'Files copied from the live website' }]
  };
}

const { datasets } = loadManifest();
/* A link to a first-version DOI in an old record is rewritten to the concept DOI (all versions). */
const versionDois = Object.fromEntries(datasets.map((d) => [`10.5281/zenodo.${d.zenodo.recordId}`, d.zenodo.conceptDoi]));
if (!TOKEN && !DRY) throw new Error('ZENODO_TOKEN is not set (or run with DRY_RUN=1).');

let failures = 0;
for (const d of datasets) {
  try {
    const latest = await api('GET', `/records/${d.zenodo.recordId}/versions/latest`);
    const remote = Object.fromEntries((await api('GET', `/records/${latest.id}/files`)).entries.map((e) => [e.key, e.checksum.replace(/^md5:/, '')]));
    const local = [];
    for (const f of d.allFiles) { const buf = await download(f.url); local.push({ ...f, buf, md5: md5(buf) }); }
    const changed = local.filter((f) => !f.volatile && remote[f.key] !== f.md5).map((f) => f.key);
    const gone = Object.keys(remote).filter((k) => !local.some((f) => f.key === k));
    if (!changed.length && !gone.length) { say(`${d.id}: unchanged since version ${latest.metadata.version} (record ${latest.id})`); continue; }
    say(`${d.id}: ${changed.length} changed${gone.length ? `, ${gone.length} removed` : ''} (${[...changed, ...gone].slice(0, 6).join(', ')}${changed.length + gone.length > 6 ? ', …' : ''})`);
    if (DRY) continue;

    const draft = await api('POST', `/records/${latest.id}/versions`);
    const id = draft.id;
    const full = await api('GET', `/records/${id}/draft`);
    await api('PUT', `/records/${id}/draft`, {
      metadata: cleanMetadata(full.metadata, d, versionDois), access: full.access,
      files: { enabled: true, ...(full.files?.default_preview ? { default_preview: full.files.default_preview } : {}) },
      pids: {}, custom_fields: full.custom_fields || {}
    });
    /* A new version starts without files; upload the current set. */
    const existing = (await api('GET', `/records/${id}/draft/files`)).entries || [];
    for (const e of existing) await api('DELETE', `/records/${id}/draft/files/${encodeURIComponent(e.key)}`);
    await api('POST', `/records/${id}/draft/files`, local.map((f) => ({ key: f.key })));
    for (const f of local) {
      await api('PUT', `/records/${id}/draft/files/${encodeURIComponent(f.key)}/content`, f.buf, 'application/octet-stream');
      const c = await api('POST', `/records/${id}/draft/files/${encodeURIComponent(f.key)}/commit`);
      if (c.checksum !== `md5:${f.md5}`) throw new Error(`${f.key}: checksum ${c.checksum} != md5:${f.md5}`);
    }
    await api('POST', `/records/${id}/draft/pids/doi`).catch(() => null);
    const pub = await api('POST', `/records/${id}/draft/actions/publish`);
    say(`${d.id}: published version ${today}, record ${pub.id}, DOI ${pub.pids?.doi?.identifier} (all versions: ${d.zenodo.conceptDoi})`);
  } catch (e) {
    failures++;
    say(`${d.id}: FAILED ${e.message}`);
  }
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Zenodo${DRY ? ' (dry run)' : ''}\n\n${log.map((l) => `- ${l}`).join('\n')}\n`);
if (failures) process.exit(1);
