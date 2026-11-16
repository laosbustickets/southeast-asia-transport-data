// CommonJS entry of @seatransport/data (same functions as index.js).
'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const DATA = join(__dirname, 'data');
const catalogue = JSON.parse(readFileSync(join(DATA, 'catalogue.json'), 'utf8'));

function check(country, file) {
  const c = catalogue.countries[country];
  if (!c) throw new Error(`Unknown country "${country}". Use one of: ${Object.keys(catalogue.countries).join(', ')}`);
  if (file !== undefined && !c.files.includes(file)) {
    throw new Error(`"${file}" is not in ${country}. Files: ${c.files.join(', ')}`);
  }
  return c;
}
const parse = (file, text) => (/\.(geo)?json$/.test(file) ? JSON.parse(text) : text);

const countries = () => Object.keys(catalogue.countries);
const files = (country) => [...check(country).files];
const info = (country) => ({ ...check(country) });
function path(country, file) {
  check(country, file);
  return join(DATA, country, file);
}
function load(country, file) {
  return parse(file, readFileSync(path(country, file), 'utf8'));
}
async function loadLatest(country, file) {
  check(country, file);
  const r = await fetch(`${catalogue.latestBase}${country}/${file}`);
  if (!r.ok) throw new Error(`GitHub returned HTTP ${r.status} for ${country}/${file}`);
  return parse(file, await r.text());
}

module.exports = { catalogue, countries, files, info, path, load, loadLatest };
