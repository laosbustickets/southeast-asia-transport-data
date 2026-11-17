// What each registry last received, kept in packages/published.json, so npm and PyPI each catch up on their own.
//   node packages/state.mjs check            -> writes npm=true|false, pypi=true|false, version, hash to $GITHUB_OUTPUT
//   node packages/state.mjs record npm|pypi  -> records the built version for the registries named
// FORCE=true makes check answer true for both.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = 'packages/published.json';
const built = JSON.parse(readFileSync('packages/dist/state.json', 'utf8'));
let published = {};
try { published = JSON.parse(readFileSync(FILE, 'utf8')); } catch { /* first run */ }

const [cmd, ...regs] = process.argv.slice(2);
if (cmd === 'check') {
  const out = [`version=${built.version}`, `hash=${built.dataHash}`];
  for (const reg of ['npm', 'pypi']) {
    const last = published[reg]?.dataHash || '';
    const go = process.env.FORCE === 'true' || last !== built.dataHash;
    out.push(`${reg}=${go}`);
    console.log(`${reg}: last ${last || 'never'} (${published[reg]?.version || '-'}), now ${built.dataHash} -> ${go ? 'publish' : 'unchanged'}`);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, out.join('\n') + '\n');
} else if (cmd === 'record') {
  const rec = { version: built.version, dataHash: built.dataHash, date: new Date().toISOString().slice(0, 10) };
  for (const reg of regs) published[reg] = rec;
  writeFileSync(FILE, JSON.stringify(published, null, 2) + '\n');
  console.log(`recorded ${regs.join(', ') || 'nothing'} at ${built.version}`);
} else {
  console.error('usage: node packages/state.mjs check | record <npm|pypi>...');
  process.exit(2);
}
