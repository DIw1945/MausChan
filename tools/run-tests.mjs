// Expand filenames here so npm test also works with Windows cmd.exe.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const tests = readdirSync(new URL('../tests/', import.meta.url))
  .filter(name => name.endsWith('.test.mjs')).sort()
  .map(name => fileURLToPath(new URL('../tests/' + name, import.meta.url)));
if (!tests.length) throw new Error('No test files found. Extract the complete ZIP first.');
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
