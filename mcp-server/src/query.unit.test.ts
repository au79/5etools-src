import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { Catalog } from './catalog.js';
import { createCatalog } from './catalog.js';
import { getCatalogRecord, QueryError, searchCatalog } from './query.js';

function getCatalog() {
  return createCatalog(fileURLToPath(new URL('../../..', import.meta.url)));
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

  void test('searches player-option catalog domains', () => {
    const catalog = getCatalog();

    const backgrounds = searchCatalog(catalog, { domain: 'background', query: 'acolyte', source: 'PHB' });
    const feats = searchCatalog(catalog, { domain: 'feat', query: 'alert', source: 'PHB' });
    const optionalFeatures = searchCatalog(catalog, {
      domain: 'optionalfeature',
      query: 'agonizing blast',
      source: 'PHB',
    });
    const facilities = searchCatalog(catalog, { domain: 'facility', query: 'ancient altar', source: 'RHW' });
    const spells = searchCatalog(catalog, { domain: 'spell', query: 'acid splash', source: 'PHB' });

    assert.equal(backgrounds[0]?.id, 'background/acolyte/phb');
    assert.equal(feats[0]?.id, 'feat/alert/phb');
    assert.equal(optionalFeatures[0]?.id, 'optionalfeature/agonizing%20blast/phb');
    assert.equal(facilities[0]?.id, 'facility/ancient%20altar/rhw');
    assert.equal(spells[0]?.id, 'spell/acid%20splash/phb');
  });

  void test('keeps duplicate player-option names ambiguous without a source', () => {
    const catalog = getCatalog();

    assert.throws(
      () => getCatalogRecord(catalog, { domain: 'optionalfeature', name: 'Agonizing Blast' }),
      (error: unknown) =>
        error instanceof QueryError &&
        error.candidates.some((candidate) => candidate.id === 'optionalfeature/agonizing%20blast/phb') &&
        error.candidates.some((candidate) => candidate.id === 'optionalfeature/agonizing%20blast/xphb'),
    );
  });

  void test('keeps duplicate spell names ambiguous without a source', () => {
    const catalog = getCatalog();

    assert.throws(
      () => getCatalogRecord(catalog, { domain: 'spell', name: 'Blade of Disaster' }),
      (error: unknown) =>
        error instanceof QueryError &&
        error.candidates.some((candidate) => candidate.id === 'spell/blade%20of%20disaster/frhof') &&
        error.candidates.some((candidate) => candidate.id === 'spell/blade%20of%20disaster/tce'),
    );
  });

  void test('searches actions and keeps duplicate names ambiguous without a source', () => {
    const catalog = getCatalog();

    assert.equal(
      searchCatalog(catalog, { domain: 'action', query: 'attack', source: 'PHB' })[0]?.id,
      'action/attack/phb',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'action', name: 'Attack', source: 'PHB' })?.id,
      'action/attack/phb',
    );
    assert.throws(
      () => getCatalogRecord(catalog, { domain: 'action', name: 'Attack' }),
      (error: unknown) =>
        error instanceof QueryError &&
        error.candidates.some((candidate) => candidate.id === 'action/attack/phb') &&
        error.candidates.some((candidate) => candidate.id === 'action/attack/xphb'),
    );
  });

  void test('searches condition reference domains and keeps duplicate names ambiguous', () => {
    const catalog = getCatalog();
    assert.equal(
      searchCatalog(catalog, { domain: 'condition', query: 'blinded', source: 'PHB' })[0]?.id,
      'condition/blinded/phb',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'disease', name: 'Cackle Fever', source: 'DMG' })?.id,
      'disease/cackle%20fever/dmg',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'status', name: 'Bloodied', source: 'XPHB' })?.id,
      'status/bloodied/xphb',
    );
    assert.throws(() => getCatalogRecord(catalog, { domain: 'condition', name: 'Blinded' }), QueryError);
  });

  void test('searches language domains and keeps duplicate names ambiguous', () => {
    const catalog = getCatalog();
    assert.equal(
      searchCatalog(catalog, { domain: 'language', query: 'common', source: 'PHB' })[0]?.id,
      'language/common/phb',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'languageScript', name: 'Draconic', source: 'PHB' })?.id,
      'languagescript/draconic/phb',
    );
    assert.throws(() => getCatalogRecord(catalog, { domain: 'language', name: 'Common' }), QueryError);
  });

  void test('searches objects and keeps duplicate names ambiguous', () => {
    const catalog = getCatalog();
    assert.equal(
      searchCatalog(catalog, { domain: 'object', query: 'ballista', source: 'DMG' })[0]?.id,
      'object/ballista/dmg',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'object', name: 'Ballista', source: 'DMG' })?.id,
      'object/ballista/dmg',
    );
    assert.throws(() => getCatalogRecord(catalog, { domain: 'object', name: 'Ballista' }), QueryError);
  });

  void test('searches traps and hazards with source-aware identities', () => {
    const catalog = getCatalog();
    assert.equal(
      searchCatalog(catalog, { domain: 'trap', query: 'falling net', source: 'DMG' })[0]?.id,
      'trap/falling%20net/dmg',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'hazard', name: 'Avalanche', source: 'IDRotF' })?.id,
      'hazard/avalanche/idrotf',
    );
    assert.throws(() => getCatalogRecord(catalog, { domain: 'trap', name: 'Falling Net' }), QueryError);
    assert.throws(() => getCatalogRecord(catalog, { domain: 'hazard', name: 'Avalanche' }), QueryError);
  });

  void test('searches deities and keeps duplicate names ambiguous', () => {
    const catalog = getCatalog();
    assert.equal(
      searchCatalog(catalog, { domain: 'deity', query: 'aegir', source: 'PHB' })[0]?.id,
      'deity/norse/aegir/phb',
    );
    assert.equal(getCatalogRecord(catalog, { id: 'deity/norse/aegir/phb' })?.id, 'deity/norse/aegir/phb');
    assert.throws(() => getCatalogRecord(catalog, { domain: 'deity', name: 'Oghma', source: 'PHB' }), QueryError);
  });

  void test('searches tables by their source-aware identity', () => {
    const catalog = getCatalog();
    assert.equal(
      getCatalogRecord(catalog, { domain: 'table', name: '2,500 gp Art Objects', source: 'PSX' })?.id,
      'table/2%2C500%20gp%20art%20objects/psx',
    );
  });

  void test('searches indexed monsters without loading bestiary support files', () => {
    const catalog = getCatalog();
    assert.equal(
      searchCatalog(catalog, { domain: 'monster', query: 'aboleth', source: 'MM' })[0]?.id,
      'monster/aboleth/mm',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'monster', name: 'Aboleth', source: 'MM' })?.file,
      'data/bestiary/bestiary-mm.json',
    );
    assert.throws(() => getCatalogRecord(catalog, { domain: 'monster', name: 'Space Hamster' }), QueryError);

    const variant = getCatalogRecord(catalog, { domain: 'monster', name: 'Living Portent', source: 'BMT' });
    assert.ok(Array.isArray(variant?.data.variant));

    const complexAction = getCatalogRecord(catalog, { domain: 'monster', name: 'Pazrodine', source: 'BMT' });
    assert.ok(Array.isArray(complexAction?.data.action));
    assert.ok(
      (complexAction?.data.action as readonly unknown[]).some(
        (action) => typeof action === 'object' && action !== null,
      ),
    );
  });

  void test('searches monster template domains by their source-aware identities', () => {
    const catalog = getCatalog();
    assert.equal(
      getCatalogRecord(catalog, { domain: 'monsterTemplate', name: 'Aarakocra', source: 'DMG' })?.id,
      'monstertemplate/aarakocra/dmg',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'legendaryGroupTemplate', name: 'Shadow Dragon', source: 'FTD' })?.id,
      'legendarygrouptemplate/shadow%20dragon/ftd',
    );
  });

  void test('retrieves raw encounter and loot support records without selection', () => {
    const catalog = getCatalog();
    assert.equal(
      getCatalogRecord(catalog, { domain: 'encounter', name: 'Airborne Encounters', source: 'EFA' })?.id,
      'encounter/airborne%20encounters/efa',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'lootIndividual', name: 'Challenge 0-4', source: 'DMG' })?.id,
      'lootindividual/challenge%200-4/dmg',
    );
    assert.equal(
      getCatalogRecord(catalog, { domain: 'lootMagicItem', name: 'Magic Item Table A', source: 'DMG' })?.id,
      'lootmagicitem/magic%20item%20table%20a/dmg',
    );
    const mundaneItems = getCatalogRecord(catalog, {
      domain: 'lootDragonMundaneItemTable',
      name: 'Dragon Mundane Items',
      source: 'FTD',
    });
    assert.equal(mundaneItems?.id, 'lootdragonmundaneitemtable/ftd');
    assert.equal(mundaneItems?.page, 72);
    assert.ok(Array.isArray(mundaneItems?.data));
  });

  void test('searches and safely retrieves every equipment domain', () => {
    const catalog = getCatalog();
    const records = [
      ['item', 'Bag of Holding', 'DMG', 'item/bag%20of%20holding/dmg'],
      ['itemGroup', 'Arcane Focus', 'PHB', 'itemgroup/arcane%20focus/phb'],
      ['itemBase', 'Dagger', 'PHB', 'itembase/dagger/phb'],
      ['itemType', 'Melee Weapon', 'PHB', 'itemtype/melee%20weapon/phb'],
      ['itemTypeAdditionalEntries', 'Gaming Set', 'XGE', 'itemtypeadditionalentries/gaming%20set/xge'],
      ['itemEntry', 'Absorbing Tattoo', 'TCE', 'itementry/absorbing%20tattoo/tce'],
      ['itemMastery', 'Cleave', 'XPHB', 'itemmastery/cleave/xphb'],
      ['vehicle', 'Apparatus of Kwalish', 'DMG', 'vehicle/apparatus%20of%20kwalish/dmg'],
      ['vehicleUpgrade', 'Acidic Bile Sprayer', 'BGDIA', 'vehicleupgrade/acidic%20bile%20sprayer/bgdia'],
    ] as const;

    for (const [domain, name, source, id] of records) {
      assert.equal(searchCatalog(catalog, { domain, query: name, source })[0]?.id, id);
      assert.equal(getCatalogRecord(catalog, { domain, name, source })?.id, id);
    }
    assert.equal(
      getCatalogRecord(catalog, { abbreviation: 'A', domain: 'itemProperty', source: 'PHB' })?.id,
      'itemproperty/a/phb',
    );
    assert.ok(searchCatalog(catalog, { domain: 'itemProperty', query: 'a', source: 'PHB' }).length > 0);
    assert.throws(
      () => getCatalogRecord(catalog, { abbreviation: 'A', domain: 'itemProperty' }),
      (error: unknown) => error instanceof QueryError && error.candidates.length > 1,
    );
  });

  void test('ranks exact and name matches ahead of incidental text matches', () => {
    const catalog = {
      records: [
        {
          data: { entries: ['A human-friendly description.'], name: 'Dragonborn', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/dragonborn/tst',
          name: 'Dragonborn',
          source: 'TST',
          sourceRoot: 'data',
        },
        {
          data: { name: 'Variant Human', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/variant-human/tst',
          name: 'Variant Human',
          source: 'TST',
          sourceRoot: 'data',
        },
        {
          data: { name: 'Human Variant', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/human-variant/tst',
          name: 'Human Variant',
          source: 'TST',
          sourceRoot: 'data',
        },
        {
          data: { name: 'Human', source: 'TST' },
          domain: 'race',
          file: 'data/races.json',
          id: 'race/human/tst',
          name: 'Human',
          source: 'TST',
          sourceRoot: 'data',
        },
      ],
    } as unknown as Catalog;

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
