import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CatalogError, createPhaseOneCatalog, createRecordId, getCatalogDiagnostics } from './catalog.js';

function createFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), '5etools-mcp-catalog-'));
  mkdirSync(join(root, 'data', 'class'), { recursive: true });
  writeFileSync(join(root, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, 'data', 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, 'data', 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
  return root;
}

void describe('Phase 1 catalog', () => {
  void test('keeps validated records intact and attaches provenance', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const catalog = createPhaseOneCatalog(projectRoot);
    const human = catalog.records.find(
      (record) => record.domain === 'race' && record.data.name === 'Human' && record.source === 'PHB',
    );

    assert.ok(human);
    assert.equal(human.file, 'data/races.json');
    assert.equal(human.sourceRoot, 'data');
    assert.equal(human.id, 'race/human/phb');
    assert.equal(JSON.stringify(human.data), JSON.stringify({ ...human.data }));
  });

  void test('creates stable parent-aware record IDs', () => {
    const record = { className: 'Wizard', classSource: 'PHB', level: 1, name: 'Spellcasting', source: 'PHB' };

    assert.equal(createRecordId('classFeature', record), 'classfeature/wizard/phb/1/spellcasting/phb');
    assert.equal(createRecordId('classFeature', record), createRecordId('classFeature', { ...record }));
  });

  void test('distinguishes every Phase 1 identity shape', () => {
    assert.equal(createRecordId('race', { name: 'Human', source: 'PHB' }), 'race/human/phb');
    assert.equal(createRecordId('class', { name: 'Wizard', source: 'PHB' }), 'class/wizard/phb');
    assert.equal(
      createRecordId('subrace', { name: 'High Elf', raceName: 'Elf', raceSource: 'PHB', source: 'PHB' }),
      'subrace/elf/phb/high%20elf/phb',
    );
    assert.equal(
      createRecordId('subrace', { _copy: { name: 'Variant', raceName: 'Human', raceSource: 'PHB' }, source: 'PSA' }),
      'subrace/human/phb/variant/psa',
    );
    assert.equal(
      createRecordId('subrace', { _copy: [], source: 'PSA' }),
      'subrace/unknown-race/unknown-source/psa/psa',
    );
    assert.equal(
      createRecordId('subrace', { _copy: null, source: 'PSA' }),
      'subrace/unknown-race/unknown-source/psa/psa',
    );
    assert.equal(
      createRecordId('subclass', { className: 'Wizard', classSource: 'PHB', name: 'Evocation', source: 'PHB' }),
      'subclass/wizard/phb/evocation/phb',
    );
    assert.equal(
      createRecordId('subclassFeature', {
        className: 'Wizard',
        classSource: 'PHB',
        level: 2,
        name: 'Sculpt Spells',
        source: 'PHB',
        subclassShortName: 'Evocation',
        subclassSource: 'PHB',
      }),
      'subclassfeature/wizard/phb/evocation/phb/2/sculpt%20spells/phb',
    );
    assert.throws(
      () => createRecordId('race', { name: 'Human' }),
      (error: unknown) => error instanceof CatalogError && error.message.includes('source'),
    );
  });

  void test('rejects colliding IDs rather than merging records', () => {
    const root = createFixtureRoot();
    writeFileSync(
      join(root, 'data', 'races.json'),
      '{ "race": [{ "name": "Human", "source": "PHB" }, { "name": "Human", "source": "PHB" }], "subrace": [] }',
    );

    assert.throws(
      () => createPhaseOneCatalog(root),
      (error: unknown) => error instanceof CatalogError && error.message.includes('Duplicate catalog ID'),
    );
  });

  void test('reports a snapshot suitable for diagnostics', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const diagnostics = getCatalogDiagnostics(createPhaseOneCatalog(projectRoot));

    assert.ok(diagnostics.fileCount > 1);
    assert.ok(diagnostics.recordCount > 2_000);
    assert.deepEqual(diagnostics.sourceRoots, ['data']);
  });
});
