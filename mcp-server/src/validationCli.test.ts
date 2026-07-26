import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

function createFixtureRoot(): string {
  const root = join(tmpdir(), `5etools-mcp-validation-cli-${crypto.randomUUID()}`);
  mkdirSync(join(root, 'data', 'class'), { recursive: true });
  writeFileSync(join(root, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, 'data', 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, 'data', 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
  return root;
}

function runValidationCli(root: string, args: readonly string[] = []): SpawnSyncReturns<string> {
  const cliPath = fileURLToPath(new URL('./validationCli.js', import.meta.url));
  return spawnSync(process.execPath, [cliPath, '--root', root, ...args], {
    encoding: 'utf8',
    env: {},
    cwd: root,
  });
}

void describe('Validation CLI', () => {
  void test('exits zero for valid data and nonzero for an incompatible fixture', () => {
    const root = createFixtureRoot();
    const valid = runValidationCli(root);

    assert.equal(valid.status, 0);
    assert.match(valid.stdout, /Validation succeeded: 2 files across data\./);
    assert.equal(valid.stderr, '');

    writeFileSync(
      join(root, 'data', 'races.json'),
      '{ "race": [{ "name": "Human", "source": "PHB", "bad": true }], "subrace": [] }',
    );
    const invalid = runValidationCli(root);

    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /data\/races\.json/);
  });
});
