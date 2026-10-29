// Expands datasets.json into one flat file list per country: { key, path, url, volatile }.
import { readFileSync } from 'node:fs';

export function loadManifest(file = new URL('../datasets.json', import.meta.url)) {
  const m = JSON.parse(readFileSync(file, 'utf8'));
  for (const d of m.datasets) {
    const maps = [];
    for (const lang of m.languages) {
      for (const variant of d.maps.variants) {
        const key = d.maps.pattern.replace('{lang}', lang).replace('{variant}', variant);
        maps.push({ key, path: `${d.maps.dir}/${key}` });
      }
    }
    d.allFiles = [...d.files, ...maps].map((f) => ({ volatile: false, ...f, url: `${d.site}/data/${f.key}` }));
  }
  return m;
}

// Fetch with a few retries: a site that is briefly unreachable should not fail the run.
export async function download(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'southeast-asia-transport-data sync' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 5000 * i));
    }
  }
}
