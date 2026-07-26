import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  validateCatalogProjectRoot,
  validateCollectionFile,
  validateCollectionRecords,
  ValidationError,
} from './validation.js';

void describe('Phase 1 validation', () => {
  void test('accepts minimal records and preserves the raw records', () => {
    const records = [{ name: 'Human', source: 'PHB', entries: ['A tagged {@spell shield} entry.'] }];
    const backgrounds = [{ entries: ['A learned priest.'], name: 'Acolyte', source: 'PHB' }];
    const feats = [{ entries: ['Always alert.'], name: 'Alert', source: 'PHB' }];
    const optionalFeatures = [{ featureType: ['EI'], name: 'Agonizing Blast', source: 'PHB' }];
    const facilities = [{ facilityType: 'special', level: 5, name: 'Ancient Altar', source: 'RHW' }];

    assert.strictEqual(validateCollectionRecords('data/races.json', 'race', records), records);
    assert.strictEqual(validateCollectionRecords('data/backgrounds.json', 'background', backgrounds), backgrounds);
    assert.strictEqual(validateCollectionRecords('data/feats.json', 'feat', feats), feats);
    assert.strictEqual(
      validateCollectionRecords('data/optionalfeatures.json', 'optionalfeature', optionalFeatures),
      optionalFeatures,
    );
    assert.strictEqual(validateCollectionRecords('data/bastions.json', 'facility', facilities), facilities);
    assert.doesNotThrow(() =>
      validateCollectionRecords('data/bastions.json', 'facility', [
        { facilityType: 'basic', name: 'Bedroom', source: 'XDMG' },
      ]),
    );
    assert.doesNotThrow(() =>
      validateCollectionRecords('data/spells/spells-phb.json', 'spell', [
        { entries: [{ by: 'A wizard', entries: ['Magic has a price.'], type: 'quote' }], name: 'Quote', source: 'TST' },
      ]),
    );
    assert.doesNotThrow(() =>
      validateCollectionRecords('data/backgrounds.json', 'background', [
        {
          entries: [{ entries: ['A table follows.'], id: 'table-1', name: 'Details', type: 'section' }],
          name: 'Sage',
          source: 'PHB',
        },
      ]),
    );
    assert.deepEqual(
      validateCollectionRecords('class-fixture.json', 'classFeature', [
        { className: 'Fighter', classSource: 'PHB', level: 1, name: 'Feature', source: 'PHB' },
      ]),
      [{ className: 'Fighter', classSource: 'PHB', level: 1, name: 'Feature', source: 'PHB' }],
    );
  });

  void test('reports unknown fields and changed field types with record identity', () => {
    assert.throws(
      () => validateCollectionRecords('data/races.json', 'race', [{ name: 'Human', source: 'PHB', unexpected: true }]),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.failures.some(
          (failure) =>
            failure.path.join('.') === '0.unexpected' &&
            failure.recordName === 'Human' &&
            failure.recordSource === 'PHB',
        ),
    );
    assert.throws(
      () => validateCollectionRecords('data/races.json', 'race', [{ name: 'Human', page: '1', source: 'PHB' }]),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.failures.some((failure) => failure.path.join('.') === '0.page' && failure.message.includes('number')),
    );
    assert.throws(
      () =>
        validateCollectionRecords('data/races.json', 'race', [
          { entries: [{ entries: 'not an array', type: 'entries' }], name: 'Human', source: 'PHB' },
        ]),
      (error: unknown) =>
        error instanceof ValidationError && error.failures.some((failure) => failure.path.join('.') === '0.entries.0'),
    );
    assert.throws(
      () =>
        validateCollectionRecords('data/races.json', 'race', [
          { entries: [{ type: 'entries', unsupported: true }], name: 'Human', source: 'PHB' },
        ]),
      (error: unknown) =>
        error instanceof ValidationError && error.failures.some((failure) => failure.path.join('.') === '0.entries.0'),
    );
    assert.throws(
      () => validateCollectionRecords('data/races.json', 'race', [{ name: 'Human' }]),
      (error: unknown) =>
        error instanceof ValidationError && error.failures.some((failure) => failure.path.join('.') === '0.source'),
    );
    assert.throws(
      () => validateCollectionRecords('data/races.json', 'race', [{ name: 1, source: 2 }]),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.failures.every((failure) => failure.recordName === undefined && failure.recordSource === undefined),
    );
  });

  void test('requires the requested collections and rejects unknown top-level collections', () => {
    assert.throws(
      () => validateCollectionFile('data/races.json', { race: [] }, ['race', 'subrace']),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.failures.some((failure) => failure.path.join('.') === 'subrace' && failure.message.includes('missing')),
    );
    assert.throws(
      () => validateCollectionFile('data/races.json', { race: [], subrace: [], spell: [] }, ['race', 'subrace']),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.failures.some(
          (failure) => failure.path.join('.') === 'spell' && failure.message.includes('Unrecognized'),
        ),
    );
  });

  void test('reports invalid record and file container types', () => {
    assert.throws(
      () => validateCollectionRecords('data/races.json', 'race', {}),
      (error: unknown) => error instanceof ValidationError && error.failures[0]?.path.length === 0,
    );

    for (const value of ['', null, []]) {
      assert.throws(
        () => validateCollectionFile('data/races.json', value, ['race']),
        (error: unknown) => error instanceof ValidationError && error.failures[0]?.message.includes('JSON object'),
      );
    }
  });

  void test('validates the full Phase 1 rollout in the live checkout', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const result = validateCatalogProjectRoot(projectRoot);

    assert.ok(result.files.includes('data/races.json'));
    assert.ok(result.files.includes('data/backgrounds.json'));
    assert.ok(result.files.includes('data/feats.json'));
    assert.ok(result.files.includes('data/optionalfeatures.json'));
    assert.ok(result.files.includes('data/bastions.json'));
    assert.ok(result.files.includes('data/spells/spells-phb.json'));
    assert.ok(result.files.some((file) => file.startsWith('data/class/class-')));
  });
});
