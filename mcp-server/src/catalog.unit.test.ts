import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CatalogError, createCatalog, createRecordId, getCatalogDiagnostics, getMetadataSourceIds } from './catalog.js';

function createFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), '5etools-mcp-catalog-'));
  mkdirSync(join(root, 'data', 'class'), { recursive: true });
  mkdirSync(join(root, 'data', 'bestiary'), { recursive: true });
  mkdirSync(join(root, 'data', 'spells'), { recursive: true });
  writeFileSync(join(root, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, 'data', 'backgrounds.json'), '{ "background": [] }');
  writeFileSync(join(root, 'data', 'feats.json'), '{ "feat": [] }');
  writeFileSync(join(root, 'data', 'optionalfeatures.json'), '{ "optionalfeature": [] }');
  writeFileSync(join(root, 'data', 'bastions.json'), '{ "facility": [] }');
  writeFileSync(join(root, 'data', 'actions.json'), '{ "action": [] }');
  writeFileSync(join(root, 'data', 'conditionsdiseases.json'), '{ "condition": [], "disease": [], "status": [] }');
  writeFileSync(join(root, 'data', 'languages.json'), '{ "language": [], "languageScript": [] }');
  writeFileSync(join(root, 'data', 'objects.json'), '{ "object": [] }');
  writeFileSync(join(root, 'data', 'trapshazards.json'), '{ "trap": [], "hazard": [] }');
  writeFileSync(join(root, 'data', 'deities.json'), '{ "deity": [] }');
  writeFileSync(join(root, 'data', 'tables.json'), '{ "table": [] }');
  writeFileSync(join(root, 'data', 'items.json'), '{ "item": [], "itemGroup": [] }');
  writeFileSync(
    join(root, 'data', 'items-base.json'),
    '{ "baseitem": [], "itemProperty": [], "itemType": [], "itemTypeAdditionalEntries": [], "itemEntry": [], "itemMastery": [] }',
  );
  writeFileSync(join(root, 'data', 'vehicles.json'), '{ "vehicle": [], "vehicleUpgrade": [] }');
  writeFileSync(join(root, 'data', 'encounters.json'), '{ "encounter": [] }');
  writeFileSync(
    join(root, 'data', 'loot.json'),
    '{ "individual": [], "hoard": [], "dragon": [], "gems": [], "artObjects": [], "magicItems": [], "dragonMundaneItems": [] }',
  );
  writeFileSync(join(root, 'data', 'spells', 'index.json'), '{ "PHB": "spells-fixture.json" }');
  writeFileSync(join(root, 'data', 'spells', 'spells-fixture.json'), '{ "spell": [] }');
  writeFileSync(join(root, 'data', 'bestiary', 'index.json'), '{ "TST": "bestiary-fixture.json" }');
  writeFileSync(join(root, 'data', 'bestiary', 'bestiary-fixture.json'), '{ "monster": [] }');
  writeFileSync(
    join(root, 'data', 'bestiary', 'template.json'),
    '{ "monsterTemplate": [], "legendaryGroupTemplate": [] }',
  );
  writeFileSync(join(root, 'data', 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, 'data', 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
  return root;
}

function createAlternateSourceRoot(root: string, name: string): void {
  mkdirSync(join(root, name, 'class'), { recursive: true });
  mkdirSync(join(root, name, 'bestiary'), { recursive: true });
  mkdirSync(join(root, name, 'spells'), { recursive: true });
  writeFileSync(join(root, name, 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, name, 'backgrounds.json'), '{ "background": [] }');
  writeFileSync(join(root, name, 'feats.json'), '{ "feat": [] }');
  writeFileSync(join(root, name, 'optionalfeatures.json'), '{ "optionalfeature": [] }');
  writeFileSync(join(root, name, 'bastions.json'), '{ "facility": [] }');
  writeFileSync(join(root, name, 'actions.json'), '{ "action": [] }');
  writeFileSync(join(root, name, 'conditionsdiseases.json'), '{ "condition": [], "disease": [], "status": [] }');
  writeFileSync(join(root, name, 'languages.json'), '{ "language": [], "languageScript": [] }');
  writeFileSync(join(root, name, 'objects.json'), '{ "object": [] }');
  writeFileSync(join(root, name, 'trapshazards.json'), '{ "trap": [], "hazard": [] }');
  writeFileSync(join(root, name, 'deities.json'), '{ "deity": [] }');
  writeFileSync(join(root, name, 'tables.json'), '{ "table": [] }');
  writeFileSync(join(root, name, 'items.json'), '{ "item": [], "itemGroup": [] }');
  writeFileSync(
    join(root, name, 'items-base.json'),
    '{ "baseitem": [], "itemProperty": [], "itemType": [], "itemTypeAdditionalEntries": [], "itemEntry": [], "itemMastery": [] }',
  );
  writeFileSync(join(root, name, 'vehicles.json'), '{ "vehicle": [], "vehicleUpgrade": [] }');
  writeFileSync(join(root, name, 'encounters.json'), '{ "encounter": [] }');
  writeFileSync(
    join(root, name, 'loot.json'),
    '{ "individual": [], "hoard": [], "dragon": [], "gems": [], "artObjects": [], "magicItems": [], "dragonMundaneItems": [] }',
  );
  writeFileSync(join(root, name, 'spells', 'index.json'), '{ "PHB": "spells-fixture.json" }');
  writeFileSync(join(root, name, 'spells', 'spells-fixture.json'), '{ "spell": [] }');
  writeFileSync(join(root, name, 'bestiary', 'index.json'), '{ "TST": "bestiary-fixture.json" }');
  writeFileSync(join(root, name, 'bestiary', 'bestiary-fixture.json'), '{ "monster": [] }');
  writeFileSync(
    join(root, name, 'bestiary', 'template.json'),
    '{ "monsterTemplate": [], "legendaryGroupTemplate": [] }',
  );
  writeFileSync(join(root, name, 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, name, 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
}

void describe('Phase 1 catalog', () => {
  void test('keeps validated records intact and attaches provenance', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const catalog = createCatalog(projectRoot);
    const human = catalog.records.find(
      (record) => record.domain === 'race' && record.data.name === 'Human' && record.source === 'PHB',
    );

    assert.ok(human);
    assert.equal(human.file, 'data/races.json');
    assert.equal(human.sourceRoot, 'data');
    assert.equal(human.id, 'race/human/phb');
    assert.equal(JSON.stringify(human.data), JSON.stringify({ ...human.data }));

    const acolyte = catalog.records.find(
      (record) => record.domain === 'background' && record.data.name === 'Acolyte' && record.source === 'PHB',
    );
    const alert = catalog.records.find(
      (record) => record.domain === 'feat' && record.data.name === 'Alert' && record.source === 'PHB',
    );

    assert.equal(acolyte?.id, 'background/acolyte/phb');
    assert.equal(acolyte?.file, 'data/backgrounds.json');
    assert.equal(alert?.id, 'feat/alert/phb');
    assert.equal(alert?.file, 'data/feats.json');

    const agonizingBlast = catalog.records.find(
      (record) =>
        record.domain === 'optionalfeature' && record.data.name === 'Agonizing Blast' && record.source === 'PHB',
    );
    const ancientAltar = catalog.records.find(
      (record) => record.domain === 'facility' && record.data.name === 'Ancient Altar' && record.source === 'RHW',
    );

    assert.equal(agonizingBlast?.id, 'optionalfeature/agonizing%20blast/phb');
    assert.equal(agonizingBlast?.file, 'data/optionalfeatures.json');
    assert.equal(ancientAltar?.id, 'facility/ancient%20altar/rhw');
    assert.equal(ancientAltar?.file, 'data/bastions.json');

    const acidSplash = catalog.records.find(
      (record) => record.domain === 'spell' && record.data.name === 'Acid Splash' && record.source === 'PHB',
    );
    assert.equal(acidSplash?.id, 'spell/acid%20splash/phb');
    assert.equal(acidSplash?.file, 'data/spells/spells-phb.json');

    const attack = catalog.records.find(
      (record) => record.domain === 'action' && record.data.name === 'Attack' && record.source === 'PHB',
    );
    assert.equal(attack?.id, 'action/attack/phb');
    assert.equal(attack?.file, 'data/actions.json');
    assert.equal(createRecordId('condition', { name: 'Blinded', source: 'PHB' }), 'condition/blinded/phb');
    assert.equal(createRecordId('object', { name: 'Ballista', source: 'DMG' }), 'object/ballista/dmg');
    assert.equal(createRecordId('trap', { name: 'Falling Net', source: 'DMG' }), 'trap/falling%20net/dmg');
    assert.equal(createRecordId('deity', { name: 'Aegir', pantheon: 'Norse', source: 'PHB' }), 'deity/norse/aegir/phb');
    assert.equal(
      createRecordId('table', { name: '2,500 gp Art Objects', source: 'PSX' }),
      'table/2%2C500%20gp%20art%20objects/psx',
    );
    assert.equal(createRecordId('monster', { name: 'Aboleth', source: 'MM' }), 'monster/aboleth/mm');
    assert.equal(
      createRecordId('monsterTemplate', { name: 'Aarakocra', source: 'DMG' }),
      'monstertemplate/aarakocra/dmg',
    );

    const equipment = [
      ['item', 'Bag of Holding', 'DMG', 'item/bag%20of%20holding/dmg', 'data/items.json'],
      ['itemGroup', 'Arcane Focus', 'PHB', 'itemgroup/arcane%20focus/phb', 'data/items.json'],
      ['itemBase', 'Dagger', 'PHB', 'itembase/dagger/phb', 'data/items-base.json'],
      ['itemType', 'Melee Weapon', 'PHB', 'itemtype/melee%20weapon/phb', 'data/items-base.json'],
      [
        'itemTypeAdditionalEntries',
        'Gaming Set',
        'XGE',
        'itemtypeadditionalentries/gaming%20set/xge',
        'data/items-base.json',
      ],
      ['itemEntry', 'Absorbing Tattoo', 'TCE', 'itementry/absorbing%20tattoo/tce', 'data/items-base.json'],
      ['itemMastery', 'Cleave', 'XPHB', 'itemmastery/cleave/xphb', 'data/items-base.json'],
      ['vehicle', 'Apparatus of Kwalish', 'DMG', 'vehicle/apparatus%20of%20kwalish/dmg', 'data/vehicles.json'],
      [
        'vehicleUpgrade',
        'Acidic Bile Sprayer',
        'BGDIA',
        'vehicleupgrade/acidic%20bile%20sprayer/bgdia',
        'data/vehicles.json',
      ],
    ] as const;
    for (const [domain, name, source, id, file] of equipment) {
      const record = catalog.records.find(
        (candidate) => candidate.domain === domain && candidate.data.name === name && candidate.source === source,
      );
      assert.equal(record?.id, id);
      assert.equal(record?.file, file);
    }

    const ammunition = catalog.records.find(
      (record) => record.domain === 'itemProperty' && record.data.abbreviation === 'A' && record.source === 'PHB',
    );
    assert.equal(ammunition?.id, 'itemproperty/a/phb');
    assert.equal(ammunition?.file, 'data/items-base.json');

    const dragonMundaneItems = catalog.records.find((record) => record.domain === 'lootDragonMundaneItemTable');
    assert.equal(dragonMundaneItems?.id, 'lootdragonmundaneitemtable/ftd');
    assert.equal(dragonMundaneItems?.name, 'Dragon Mundane Items');
    assert.equal(dragonMundaneItems?.source, 'FTD');
    assert.equal(dragonMundaneItems?.page, 72);
    assert.ok(Array.isArray(dragonMundaneItems?.data));
  });

  void test('creates stable parent-aware record IDs', () => {
    const record = { className: 'Wizard', classSource: 'PHB', level: 1, name: 'Spellcasting', source: 'PHB' };

    assert.equal(createRecordId('classFeature', record), 'classfeature/wizard/phb/1/spellcasting/phb');
    assert.equal(createRecordId('classFeature', record), createRecordId('classFeature', { ...record }));
  });

  void test('distinguishes every Phase 1 identity shape', () => {
    assert.equal(createRecordId('race', { name: 'Human', source: 'PHB' }), 'race/human/phb');
    assert.equal(createRecordId('background', { name: 'Acolyte', source: 'PHB' }), 'background/acolyte/phb');
    assert.equal(createRecordId('feat', { name: 'Alert', source: 'PHB' }), 'feat/alert/phb');
    assert.equal(
      createRecordId('optionalfeature', { name: 'Agonizing Blast', source: 'PHB' }),
      'optionalfeature/agonizing%20blast/phb',
    );
    assert.equal(createRecordId('facility', { name: 'Ancient Altar', source: 'RHW' }), 'facility/ancient%20altar/rhw');
    assert.equal(createRecordId('spell', { name: 'Acid Splash', source: 'PHB' }), 'spell/acid%20splash/phb');
    assert.equal(createRecordId('action', { name: 'Attack', source: 'PHB' }), 'action/attack/phb');
    assert.equal(createRecordId('object', { name: 'Ballista', source: 'DMG' }), 'object/ballista/dmg');
    assert.equal(createRecordId('hazard', { name: 'Avalanche', source: 'IDRotF' }), 'hazard/avalanche/idrotf');
    assert.equal(createRecordId('deity', { name: 'Aegir', pantheon: 'Norse', source: 'PHB' }), 'deity/norse/aegir/phb');
    assert.equal(createRecordId('item', { name: 'Bag of Holding', source: 'DMG' }), 'item/bag%20of%20holding/dmg');
    assert.equal(createRecordId('itemProperty', { abbreviation: 'A', source: 'PHB' }), 'itemproperty/a/phb');
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
    assert.throws(
      () => createRecordId('lootDragonMundaneItemTable', { source: 'FTD' }),
      (error: unknown) => error instanceof CatalogError && error.message.includes('fixed collection-level identity'),
    );
  });

  void test('rejects colliding IDs rather than merging records', () => {
    const root = createFixtureRoot();
    writeFileSync(
      join(root, 'data', 'races.json'),
      '{ "race": [{ "name": "Human", "source": "PHB" }, { "name": "Human", "source": "PHB" }], "subrace": [] }',
    );

    assert.throws(
      () => createCatalog(root),
      (error: unknown) => error instanceof CatalogError && error.message.includes('Duplicate catalog ID'),
    );
  });

  void test('rejects collisions between enabled source roots with provenance', () => {
    const root = createFixtureRoot();
    createAlternateSourceRoot(root, 'homebrew');
    writeFileSync(
      join(root, 'data', 'races.json'),
      '{ "race": [{ "name": "Human", "source": "PHB" }], "subrace": [] }',
    );
    writeFileSync(
      join(root, 'homebrew', 'races.json'),
      '{ "race": [{ "name": "Human", "source": "PHB" }], "subrace": [] }',
    );

    assert.throws(
      () =>
        createCatalog(root, [
          { name: 'data', path: join(root, 'data') },
          { name: 'homebrew', path: join(root, 'homebrew') },
        ]),
      (error: unknown) =>
        error instanceof CatalogError &&
        error.message.includes('data/races.json (data)') &&
        error.message.includes('homebrew/races.json (homebrew)'),
    );
  });

  void test('rejects duplicate collection-level dragon mundane item tables', () => {
    const root = createFixtureRoot();

    assert.throws(
      () =>
        createCatalog(root, [
          { name: 'data', path: join(root, 'data') },
          { name: 'data', path: join(root, 'data') },
        ]),
      (error: unknown) => error instanceof CatalogError && error.message.includes('lootdragonmundaneitemtable/ftd'),
    );
  });

  void test('catalogs enabled alternate roots with source-root provenance', () => {
    const root = createFixtureRoot();
    createAlternateSourceRoot(root, 'homebrew');
    writeFileSync(
      join(root, 'homebrew', 'races.json'),
      '{ "race": [{ "name": "Elf", "source": "HB" }], "subrace": [] }',
    );

    const catalog = createCatalog(root, [
      { name: 'data', path: join(root, 'data') },
      { name: 'homebrew', path: join(root, 'homebrew') },
    ]);
    const elf = catalog.records.find((record) => record.data.name === 'Elf');

    assert.ok(elf);
    assert.equal(elf.sourceRoot, 'homebrew');
    assert.equal(elf.file, 'homebrew/races.json');
    assert.ok(catalog.manifest.files.some((file) => file.path === 'homebrew/races.json'));

    const metadataPolicyCatalog = createCatalog(root, [{ name: 'homebrew', path: join(root, 'homebrew') }], {
      mode: 'all',
      sourceIds: [],
    });
    assert.equal(
      metadataPolicyCatalog.records.some((record) => record.domain === 'adventure'),
      false,
    );
  });

  void test('requires at least one source root', () => {
    assert.throws(
      () => createCatalog(createFixtureRoot(), []),
      (error: unknown) => error instanceof CatalogError && error.message.includes('At least one source root'),
    );
  });

  void test('reports a snapshot suitable for diagnostics', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const diagnostics = getCatalogDiagnostics(createCatalog(projectRoot));

    assert.ok(diagnostics.fileCount > 1);
    assert.ok(diagnostics.recordCount > 2_000);
    assert.deepEqual(diagnostics.sourceRoots, ['data']);
  });

  void test('keeps adventure and book metadata disabled until explicitly enabled', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    assert.equal(
      createCatalog(projectRoot).records.some((record) => record.domain === 'adventure'),
      false,
    );

    const allowlisted = createCatalog(projectRoot, undefined, { mode: 'allowlist', sourceIds: ['LMoP'] });
    const adventure = allowlisted.records.find((record) => record.domain === 'adventure');
    assert.equal(adventure?.id, 'adventure/lost%20mine%20of%20phandelver/lmop');
    assert.equal(adventure?.data.contents, undefined);
    assert.equal(
      allowlisted.records.some((record) => record.domain === 'book'),
      false,
    );

    const allMetadata = createCatalog(projectRoot, undefined, { mode: 'all', sourceIds: [] });
    assert.ok(allMetadata.records.some((record) => record.domain === 'book' && record.source === 'PHB'));

    assert.throws(
      () => createCatalog(projectRoot, undefined, { mode: 'allowlist', sourceIds: ['NotARealSource'] }),
      (error: unknown) => error instanceof CatalogError && error.message.includes('Unknown adventure source IDs'),
    );
    assert.throws(
      () => createCatalog(projectRoot, undefined, { mode: 'allowlist', sourceIds: ['LMoP', 'LMoP'] }),
      (error: unknown) => error instanceof CatalogError && error.message.includes('duplicate source IDs'),
    );
  });

  void test('rejects malformed adventure metadata indexes before accepting an allowlist', () => {
    const root = createFixtureRoot();
    writeFileSync(join(root, 'data', 'adventures.json'), '[]');
    writeFileSync(join(root, 'data', 'books.json'), '{ "book": [] }');
    assert.throws(
      () => getMetadataSourceIds(root),
      (error: unknown) => error instanceof CatalogError && error.message.includes('must contain a JSON object'),
    );

    writeFileSync(join(root, 'data', 'adventures.json'), '{ "adventure": [null, { "source": "LMoP" }] }');
    writeFileSync(join(root, 'data', 'books.json'), '{}');
    assert.throws(
      () => getMetadataSourceIds(root),
      (error: unknown) => error instanceof CatalogError && error.message.includes('has no book list'),
    );
  });
});
