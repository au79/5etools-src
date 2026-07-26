import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { formatValidationSummary, runValidationCommand } from './validationCommand.js';

function createFixtureRoot(): string {
  const root = join(tmpdir(), `5etools-mcp-validation-command-${crypto.randomUUID()}`);
  mkdirSync(join(root, 'data', 'class'), { recursive: true });
  mkdirSync(join(root, 'data', 'spells'), { recursive: true });
  writeFileSync(join(root, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, 'data', 'backgrounds.json'), '{ "background": [] }');
  writeFileSync(join(root, 'data', 'feats.json'), '{ "feat": [] }');
  writeFileSync(join(root, 'data', 'optionalfeatures.json'), '{ "optionalfeature": [] }');
  writeFileSync(join(root, 'data', 'bastions.json'), '{ "facility": [] }');
  writeFileSync(join(root, 'data', 'spells', 'index.json'), '{ "PHB": "spells-fixture.json" }');
  writeFileSync(join(root, 'data', 'spells', 'spells-fixture.json'), '{ "spell": [] }');
  writeFileSync(join(root, 'data', 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, 'data', 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
  return root;
}

function addSourceRoot(root: string, name: string): void {
  mkdirSync(join(root, name, 'class'), { recursive: true });
  mkdirSync(join(root, name, 'spells'), { recursive: true });
  writeFileSync(join(root, name, 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, name, 'backgrounds.json'), '{ "background": [] }');
  writeFileSync(join(root, name, 'feats.json'), '{ "feat": [] }');
  writeFileSync(join(root, name, 'optionalfeatures.json'), '{ "optionalfeature": [] }');
  writeFileSync(join(root, name, 'bastions.json'), '{ "facility": [] }');
  writeFileSync(join(root, name, 'spells', 'index.json'), '{ "PHB": "spells-fixture.json" }');
  writeFileSync(join(root, name, 'spells', 'spells-fixture.json'), '{ "spell": [] }');
  writeFileSync(join(root, name, 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, name, 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
}

void describe('Validation command', () => {
  void test('validates the default source and formats a concise summary', () => {
    const root = createFixtureRoot();
    const result = runValidationCommand({ defaultProjectRoot: root, environment: {}, workingDirectory: root });

    assert.equal(result.results.length, 1);
    assert.equal(result.results[0]?.files.length, 7);
    assert.equal(formatValidationSummary(result), 'Validation succeeded: 7 files across data.');
  });

  void test('uses the same source precedence as server startup', () => {
    const root = createFixtureRoot();
    addSourceRoot(root, 'homebrew');
    writeFileSync(join(root, '.5etools-mcp.jsonc'), '{ "sources": ["homebrew"] }');

    const fromConfig = runValidationCommand({ defaultProjectRoot: root, environment: {}, workingDirectory: root });
    const fromCli = runValidationCommand({
      argv: ['--sources', 'data'],
      defaultProjectRoot: root,
      environment: {},
      workingDirectory: root,
    });

    assert.deepEqual(
      fromConfig.configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
      ['homebrew'],
    );
    assert.deepEqual(
      fromCli.configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
      ['data'],
    );
  });

  void test('reports schema failures from the selected source root', () => {
    const root = createFixtureRoot();
    writeFileSync(
      join(root, 'data', 'races.json'),
      '{ "race": [{ "name": "Human", "source": "PHB", "bad": true }], "subrace": [] }',
    );

    assert.throws(
      () => runValidationCommand({ defaultProjectRoot: root, environment: {}, workingDirectory: root }),
      /data\/races\.json/,
    );
  });
});
