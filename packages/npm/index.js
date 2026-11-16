// @seatransport/data: the files bundled at publish time, and the latest copy from GitHub on request.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DATA = new URL('./data/', import.meta.url);
export const catalogue = JSON.parse(readFileSync(new URL('catalogue.json', DATA), 'utf8'));

function check(country, file) {
  const c = catalogue.countries[country];
  if (!c) throw new Error(`Unknown country "${country}". Use one of: ${Object.keys(catalogue.countries).join(', ')}`);
  if (file !== undefined && !c.files.includes(file)) {
    throw new Error(`"${file}" is not in ${country}. Files: ${c.files.join(', ')}`);
  }
  return c;
}
const parse = (file, text) => (/\.(geo)?json$/.test(file) ? JSON.parse(text) : text);

/** Country ids: laos, thailand, vietnam, cambodia, philippines, indonesia. */
export const countries = () => Object.keys(catalogue.countries);

/** The files a country holds, e.g. files('laos') -> ['README.md', 'checkpoints.json', ...]. */
export const files = (country) => [...check(country).files];

/** Website, licence, DOI and files of one country. */
export const info = (country) => ({ ...check(country) });

/** Absolute path of a bundled file. */
export function path(country, file) {
  check(country, file);
  return fileURLToPath(new URL(`${country}/${file}`, DATA));
}

/** A bundled file: parsed JSON or GeoJSON, or the text of a CSV, Markdown or licence file. */
export function load(country, file) {
  return parse(file, readFileSync(path(country, file), 'utf8'));
}

/** The same file as it is on GitHub now (synced every night from the websites). Needs network access. */
export async function loadLatest(country, file) {
  check(country, file);
  const r = await fetch(`${catalogue.latestBase}${country}/${file}`);
  if (!r.ok) throw new Error(`GitHub returned HTTP ${r.status} for ${country}/${file}`);
  return parse(file, await r.text());
}

export default { catalogue, countries, files, info, path, load, loadLatest };
