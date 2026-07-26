import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { PhaseOneCatalog } from './catalog.js';
import { createPhaseOneCatalog } from './catalog.js';
import { getCatalogRecord, QueryError, searchCatalog } from './query.js';

function getCatalog() {
  return createPhaseOneCatalog(fileURLToPath(new URL('../../..', import.meta.url)));
}

void describe('Catalog queries', () => {
  void test('searches deterministically with provenance filters and bounds', () => {
    const catalog = getCatalog();
    const records = searchCatalog(catalog, {
      domain: 'race',
      limit: 3,
      query: 'human',
      source: 'PHB',
      sourceRoot: 'data',
    });

    assert.ok(records.length > 0);
    assert.ok(records.length <= 3);
    assert.ok(
      records.every((record) => record.domain === 'race' && record.source === 'PHB' && record.sourceRoot === 'data'),
    );
    assert.equal(records[0]?.data.name, 'Human');
  });

  void test('gets a raw provenance record by stable ID', () => {
    const catalog = getCatalog();
    const record = getCatalogRecord(catalog, { id: 'race/human/phb' });

    assert.equal(record?.data.name, 'Human');
    assert.equal(record?.file, 'data/races.json');
  });

  void test('ranks exact and name matches ahead of incidental text matches', () => {
    const catalog = {
      records: [
        {
          data: { entries: ['A human-friendly description.'], name: 'Dragonborn', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/dragonborn/tst',
          source: 'TST',
          sourceRoot: 'data',
        },
        {
          data: { name: 'Variant Human', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/variant-human/tst',
          source: 'TST',
          sourceRoot: 'data',
        },
        {
          data: { name: 'Human Variant', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/human-variant/tst',
          source: 'TST',
          sourceRoot: 'data',
        },
        {
          data: { name: 'Human', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/human/tst',
          source: 'TST',
          sourceRoot: 'data',
        },
      ],
    } as unknown as PhaseOneCatalog;

    assert.deepEqual(
      searchCatalog(catalog, { query: 'human' }).map((record) => record.data.name),
      ['Human', 'Human Variant', 'Variant Human', 'Dragonborn'],
    );
  });

  void test('reports ambiguity with safe candidate labels', () => {
    const catalog = getCatalog();

    assert.throws(
      () => getCatalogRecord(catalog, { domain: 'race', name: 'Human' }),
      (error: unknown) =>
        error instanceof QueryError &&
        error.candidates.length > 1 &&
        error.candidates.every((candidate) => candidate.id.startsWith('race/')),
    );
  });

  void test('returns predictable invalid and no-match outcomes', () => {
    const catalog = getCatalog();

    assert.equal(getCatalogRecord(catalog, { id: 'race/not-real/phb' }), undefined);
    assert.equal(getCatalogRecord(catalog, { domain: 'race', name: 'Not Real', source: 'PHB' }), undefined);
    assert.throws(() => searchCatalog(catalog, { query: '' }), QueryError);
    assert.throws(() => searchCatalog(catalog, { limit: 101, query: 'human' }), QueryError);
    assert.throws(() => getCatalogRecord(catalog, { domain: 'race' }), QueryError);
  });

  void test('accepts default bounds and independent filters', () => {
    const catalog = getCatalog();

    assert.ok(searchCatalog(catalog, { query: 'human' }).length > 0);
    assert.ok(searchCatalog(catalog, { query: 'human', source: 'PHB' }).every((record) => record.source === 'PHB'));
    assert.ok(
      searchCatalog(catalog, { query: 'human', sourceRoot: 'data' }).every((record) => record.sourceRoot === 'data'),
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'race', name: 'Human', source: 'PHB', sourceRoot: 'missing' }),
      undefined,
    );
    assert.throws(() => searchCatalog(catalog, { query: 'x'.repeat(201) }), QueryError);
    assert.throws(() => searchCatalog(catalog, { limit: 0, query: 'human' }), QueryError);
  });
});
