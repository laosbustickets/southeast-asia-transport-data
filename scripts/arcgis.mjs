// Refreshes the ArcGIS Online copies of the country GeoJSON files (account seatransport) when the file in this
// repository differs from the copy ArcGIS holds. ArcGIS stores a GeoJSON added by URL as a copy, so without this
// the items would keep the data of the day they were made (17 November 2026). The Laos checkpoints item is a CSV
// linked by URL and always reads GitHub, so it is not in the list.
//
// Daily GitHub Action (.github/workflows/arcgis.yml), after the nightly sync. Needs the secret ARCGIS_PASSWORD
// (the account's password; a public ArcGIS account cannot create API keys) and optionally ARCGIS_USERNAME
// (default seatransport). Without the password the run only reports. DRY_RUN=1 only reports; FORCE=1 refreshes
// every item. Each refreshed item's "Snapshot of <date>" in its summary and description moves to today, and so
// does the date in the web map's description.
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

const PORTAL = 'https://www.arcgis.com/sharing/rest';
const USER = process.env.ARCGIS_USERNAME || 'seatransport';
const PASSWORD = process.env.ARCGIS_PASSWORD || '';
const DRY = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const FORCE = process.env.FORCE === '1' || process.argv.includes('--force');
const UA = 'southeast-asia-transport-data (+https://github.com/laosbustickets/southeast-asia-transport-data)';

const ITEMS = [
  { country: 'thailand', id: '3e71b74e55be4a868cfed71bb6f30819', path: 'thailand/thailand-transport-map.geojson' },
  { country: 'vietnam', id: 'c78475928829443ba304c9a358eee068', path: 'vietnam/vietnam-transport-map.geo.json' },
  { country: 'cambodia', id: '4a0796c473e24dd6be2473abaff00ffe', path: 'cambodia/cambodia-transport-map.geo.json' },
  { country: 'philippines', id: '626b574134c74f10baa714e38c2ed462', path: 'philippines/philippines-transit-places.geojson' },
  { country: 'indonesia', id: 'a569b035d7594a8792d3a1102e4f173f', path: 'indonesia/indonesia-transit-places.geojson' },
];
const WEBMAP = 'd12d40d4e7dd4611bb5929bef92666b0';

const log = [];
const say = (s) => { console.log(s); log.push(s); };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const SNAPSHOT = /(snapshots? of )\d{1,2} [A-Z][a-z]+ \d{4}/gi;
const redate = (text) => (text || '').replace(SNAPSHOT, (_, lead) => lead + today);

async function call(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(60000) });
  const json = await r.json().catch(() => null);
  /* The sharing API answers HTTP 200 with an "error" object when a call fails. */
  if (!r.ok || !json || json.error) throw new Error(`${url.replace(/token=[^&]+/, 'token=…')}: ${json?.error ? `${json.error.code} ${json.error.message} ${(json.error.details || []).join(' ')}` : `HTTP ${r.status}`}`);
  return json;
}

const form = (fields) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
};

async function signIn() {
  const j = await call(`${PORTAL}/generateToken`, {
    method: 'POST',
    body: new URLSearchParams({ username: USER, password: PASSWORD, client: 'referer', referer: 'https://www.arcgis.com', expiration: '30', f: 'json' }),
  });
  return j.token;
}

const changed = [];
for (const item of ITEMS) {
  const local = readFileSync(item.path);
  const r = await fetch(`${PORTAL}/content/items/${item.id}/data`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${item.country}: ArcGIS copy not readable (HTTP ${r.status})`);
  const remote = Buffer.from(await r.arrayBuffer());
  const same = sha(local) === sha(remote);
  say(`${item.country.padEnd(12)} ${same ? 'unchanged' : 'CHANGED'}${FORCE && same ? ' (forced)' : ''}  ${item.path}`);
  if (!same || FORCE) changed.push({ ...item, local });
}

if (!changed.length) {
  say('Nothing to refresh.');
} else if (DRY) {
  say(`Dry run: ${changed.length} item(s) would be refreshed.`);
} else if (!PASSWORD) {
  say(`::notice::ARCGIS_PASSWORD is not set: ${changed.length} item(s) not refreshed.`);
} else {
  const token = await signIn();
  for (const item of changed) {
    const info = await call(`${PORTAL}/content/items/${item.id}?f=json&token=${token}`);
    await call(`${PORTAL}/content/users/${USER}/items/${item.id}/update`, {
      method: 'POST',
      body: form({
        f: 'json',
        token,
        file: new Blob([item.local], { type: 'application/geo+json' }),
        filename: basename(item.path),
        snippet: redate(info.snippet),
        description: redate(info.description),
      }),
    });
    say(`${item.country}: refreshed (${item.local.length} bytes), snapshot date ${today}`);
  }
  const map = await call(`${PORTAL}/content/items/${WEBMAP}?f=json&token=${token}`);
  if ((map.description || '').search(SNAPSHOT) >= 0) {
    await call(`${PORTAL}/content/users/${USER}/items/${WEBMAP}/update`, {
      method: 'POST',
      body: form({ f: 'json', token, description: redate(map.description) }),
    });
    say(`web map: snapshot date ${today}`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ArcGIS Online\n\n${log.map((l) => `- ${l}`).join('\n')}\n`);
