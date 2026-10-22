import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('runtime response assertions drain large bodies under pipefail', async () => {
  const source = await readFile(new URL('../scripts/runtime-check.sh', import.meta.url), 'utf8');
  const assertions = source.split('\n').filter((line) => line.startsWith('curl ') && line.includes('| grep'));
  assert.equal(assertions.length, 4);
  for (const line of assertions) {
    const pipeline = line.slice(line.indexOf('|') + 1);
    const body = line.includes('/health') ? 'ok\n' : '<!doctype html>\n' + 'x'.repeat(1024 * 1024);
    const result = spawnSync('bash', ['-o', 'pipefail', '-c', `cat | ${pipeline}`], { input: body, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const missing = spawnSync('bash', ['-o', 'pipefail', '-c', `cat | ${pipeline}`], { input: 'missing marker\n', encoding: 'utf8' });
    assert.equal(missing.status, 1);
  }
});
