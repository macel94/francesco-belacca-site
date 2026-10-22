import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('synthetic cache header parsing is case insensitive with POSIX awk', async () => {
  const script = await readFile(new URL('../scripts/synthetic-check.sh', import.meta.url), 'utf8');
  const program = script.match(/cache="\$\(awk '([^']+)'/)[1];
  for (const name of ['cache-control', 'Cache-Control', 'CACHE-CONTROL']) {
    const result = spawnSync('awk', [program], { input: `HTTP/2 200\r\n${name}: no-store\r\ncontent-type: text/plain\r\n`, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'no-store\n');
  }
  const missing = spawnSync('awk', [program], { input: 'x-cache-control: no-store\r\n', encoding: 'utf8' });
  assert.equal(missing.stdout, '');
});
