// What npm last received, kept in packages/published.json, so a release happens only when the data changed.
//   node packages/state.mjs check        -> writes npm=true|false, version, hash to $GITHUB_OUTPUT
//   node packages/state.mjs record npm   -> records the built version as published
// FORCE=true makes check answer true.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = 'packages/published.json';
const built = JSON.parse(readFileSync('packages/dist/state.json', 'utf8'));
let published = {};
try { published = JSON.parse(readFileSync(FILE, 'utf8')); } catch { /* first run */ }

const [cmd, ...regs] = process.argv.slice(2);
if (cmd === 'check') {
  const last = published.npm?.dataHash || '';
  const go = process.env.FORCE === 'true' || last !== built.dataHash;
  console.log(`npm: last ${last || 'never'} (${published.npm?.version || '-'}), now ${built.dataHash} -> ${go ? 'publish' : 'unchanged'}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [`version=${built.version}`, `hash=${built.dataHash}`, `npm=${go}`].join('\n') + '\n');
  }
} else if (cmd === 'record') {
  const rec = { version: built.version, dataHash: built.dataHash, date: new Date().toISOString().slice(0, 10) };
  for (const reg of regs) published[reg] = rec;
  writeFileSync(FILE, JSON.stringify(published, null, 2) + '\n');
  console.log(`recorded ${regs.join(', ') || 'nothing'} at ${built.version}`);
} else {
  console.error('usage: node packages/state.mjs check | record npm');
  process.exit(2);
}
