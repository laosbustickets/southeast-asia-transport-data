// Builds the npm package (@seatransport/data) and the PyPI package (sea-transport-data) from the files the nightly
// sync keeps in this repository. Maps (SVG) stay out: the packages carry the data files only (about 0.7 MB).
//
// Usage: node packages/build.mjs [--root <dir>] [--version <x.y.z>]
//   --root     where the country folders are (default: the repository root)
//   --version  package version (default: today's date as YYYY.M.D, the same for npm and PyPI)
//
// Prints a JSON line { version, dataHash, files } and writes packages/dist/state.json. The hash covers every
// non-volatile data file, so the workflow publishes only when the data really changed (the Laos train timetable is
// re-read every night and does not count on its own, as for Zenodo).
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const root = resolve(opt('--root', join(here, '..')));
const now = new Date();
const version = opt('--version', `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}`);

const manifest = JSON.parse(readFileSync(join(here, '..', 'datasets.json'), 'utf8'));
const REPO = 'laosbustickets/southeast-asia-transport-data';

// One catalogue for both packages: what each country holds and where it comes from.
const catalogue = {
  name: 'Southeast Asia Transport Data',
  version,
  repository: `https://github.com/${REPO}`,
  latestBase: `https://raw.githubusercontent.com/${REPO}/main/`,
  zenodoCommunity: 'https://zenodo.org/communities/sea-transport-open-data/',
  countries: {},
};
const hash = createHash('sha256');
const files = [];
for (const d of manifest.datasets) {
  catalogue.countries[d.id] = {
    name: d.name,
    website: d.site,
    websiteName: d.siteName,
    dataPage: d.dataPage,
    license: d.license,
    doi: `https://doi.org/${d.zenodo.conceptDoi}`,
    files: d.files.map((f) => f.key),
  };
  for (const f of d.files) {
    const src = join(root, f.path);
    if (!existsSync(src)) throw new Error(`missing ${src} (run scripts/sync.mjs first)`);
    files.push({ ...f, src });
    if (!f.volatile) hash.update(f.path).update('\0').update(readFileSync(src)).update('\0');
  }
}
const dataHash = hash.digest('hex').slice(0, 16);
catalogue.dataHash = dataHash;

const dist = join(here, 'dist');
rmSync(dist, { recursive: true, force: true });

// npm
const npmOut = join(dist, 'npm');
cpSync(join(here, 'npm'), npmOut, { recursive: true });
const pkg = JSON.parse(readFileSync(join(npmOut, 'package.json'), 'utf8'));
pkg.version = version;
writeFileSync(join(npmOut, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// PyPI
const pyOut = join(dist, 'python');
cpSync(join(here, 'python'), pyOut, { recursive: true });
const pyproject = join(pyOut, 'pyproject.toml');
writeFileSync(pyproject, readFileSync(pyproject, 'utf8').replace(/^version = ".*"$/m, `version = "${version}"`));

for (const dataDir of [join(npmOut, 'data'), join(pyOut, 'src', 'sea_transport_data', 'data')]) {
  for (const f of files) {
    const out = join(dataDir, f.path);
    mkdirSync(dirname(out), { recursive: true });
    cpSync(f.src, out);
  }
  writeFileSync(join(dataDir, 'catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n');
}
for (const out of [npmOut, pyOut]) cpSync(join(here, 'README.md'), join(out, 'README.md'));

const state = { version, dataHash, files: files.length };
writeFileSync(join(dist, 'state.json'), JSON.stringify(state) + '\n');
console.log(JSON.stringify(state));
