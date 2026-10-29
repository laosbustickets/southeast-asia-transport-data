// Copies every country's files from its website into this repository (nightly, GitHub Action).
// Usage: node scripts/sync.mjs [outDir]   (outDir defaults to the repository root)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, download } from './manifest.mjs';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
const { datasets } = loadManifest();
let count = 0;
for (const d of datasets) {
  for (const f of d.allFiles) {
    const out = join(root, f.path);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, await download(f.url));
    count++;
  }
  console.log(`${d.id}: ${d.allFiles.length} files`);
}
console.log(`${count} files written to ${root}`);
