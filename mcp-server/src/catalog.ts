import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type CatalogManifest, createCatalogManifest, DEFAULT_SOURCE_ROOT } from './manifest.js';
import { type CatalogCollection, validateCollectionFile, validateDragonMundaneItems } from './validation.js';

type RawRecord = Readonly<Record<string, unknown>>;

export interface CatalogRecord {
  readonly data: RawRecord;
  readonly domain: CatalogCollection;
  readonly edition?: string | undefined;
  readonly file: string;
  readonly id: string;
  readonly name: string;
  readonly page?: number | undefined;
  readonly source: string;
  readonly sourceRoot: string;
}

export interface Catalog {
  readonly manifest: CatalogManifest;
  readonly records: readonly CatalogRecord[];
}

export interface CatalogSourceRoot {
  readonly name: string;
  readonly path: string;
}

export interface CatalogAdventurePolicy {
  readonly mode: 'disabled' | 'allowlist' | 'all';
  readonly sourceIds: readonly string[];
}

export interface CatalogDiagnostics {
  readonly fileCount: number;
  readonly recordCount: number;
  readonly sourceRoots: readonly string[];
}

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

function getString(record: RawRecord, field: string): string | undefined {
  const value = record[field];
  return typeof value === 'string' ? value : undefined;
}

function getNumber(record: RawRecord, field: string): number | undefined {
  const value = record[field];
  return typeof value === 'number' ? value : undefined;
}

function getCopyField(record: RawRecord, field: string): string | undefined {
  const copy = record._copy;
  if (typeof copy !== 'object' || copy === null || Array.isArray(copy)) return undefined;
  return getString(copy as RawRecord, field);
}

function idPart(value: string): string {
  return encodeURIComponent(value.normalize('NFKC').toLocaleLowerCase());
}

function requireIdentityPart(record: RawRecord, field: string): string {
  const value = getString(record, field);
  if (value === undefined) throw new CatalogError(`Validated record has no usable ${field} identity field.`);
  return value;
}

export function createRecordId(domain: CatalogCollection, record: RawRecord): string {
  const source = requireIdentityPart(record, 'source');
  const name = getString(record, 'name');
  let parts: readonly string[];

  switch (domain) {
    case 'race':
    case 'background':
    case 'feat':
    case 'optionalfeature':
    case 'facility':
    case 'spell':
    case 'action':
    case 'condition':
    case 'disease':
    case 'status':
    case 'language':
    case 'languageScript':
    case 'object':
    case 'trap':
    case 'hazard':
    case 'table':
    case 'monster':
    case 'monsterTemplate':
    case 'legendaryGroupTemplate':
    case 'adventure':
    case 'book':
    case 'encounter':
    case 'lootIndividual':
    case 'lootHoard':
    case 'lootDragon':
    case 'lootGem':
    case 'lootArtObject':
    case 'lootMagicItem':
    case 'item':
    case 'itemGroup':
    case 'itemBase':
    case 'itemType':
    case 'itemTypeAdditionalEntries':
    case 'itemEntry':
    case 'itemMastery':
    case 'vehicle':
    case 'vehicleUpgrade':
    case 'class':
      parts = [domain, requireIdentityPart(record, 'name'), source];
      break;
    case 'lootDragonMundaneItemTable':
      throw new CatalogError('The dragon mundane items table has a fixed collection-level identity.');
    case 'deity':
      parts = [domain, requireIdentityPart(record, 'pantheon'), requireIdentityPart(record, 'name'), source];
      break;
    case 'itemProperty':
      parts = [domain, requireIdentityPart(record, 'abbreviation'), source];
      break;
    case 'subrace':
      parts = [
        domain,
        getString(record, 'raceName') ?? getCopyField(record, 'raceName') ?? 'unknown-race',
        getString(record, 'raceSource') ?? getCopyField(record, 'raceSource') ?? 'unknown-source',
        name ?? getCopyField(record, 'name') ?? source,
        source,
      ];
      break;
    case 'subclass':
      parts = [
        domain,
        requireIdentityPart(record, 'className'),
        requireIdentityPart(record, 'classSource'),
        requireIdentityPart(record, 'name'),
        source,
      ];
      break;
    case 'classFeature':
      parts = [
        domain,
        requireIdentityPart(record, 'className'),
        requireIdentityPart(record, 'classSource'),
        String(record.level),
        requireIdentityPart(record, 'name'),
        source,
      ];
      break;
    case 'subclassFeature':
      parts = [
        domain,
        requireIdentityPart(record, 'className'),
        requireIdentityPart(record, 'classSource'),
        requireIdentityPart(record, 'subclassShortName'),
        requireIdentityPart(record, 'subclassSource'),
        String(record.level),
        requireIdentityPart(record, 'name'),
        source,
      ];
      break;
  }

  return parts.map(idPart).join('/');
}

function projectAdventureMetadata(domain: 'adventure' | 'book', record: RawRecord): RawRecord {
  const fields =
    domain === 'adventure'
      ? ['author', 'group', 'id', 'level', 'name', 'published', 'source', 'storyline']
      : ['author', 'group', 'id', 'name', 'published', 'source'];
  return Object.fromEntries(fields.flatMap((field) => (record[field] === undefined ? [] : [[field, record[field]]])));
}

export function getMetadataSourceIds(projectRoot: string): ReadonlySet<string> {
  const sourceIds = new Set<string>();
  for (const [fileName, collection] of [
    ['adventures.json', 'adventure'],
    ['books.json', 'book'],
  ] as const) {
    const value: unknown = JSON.parse(readFileSync(join(projectRoot, DEFAULT_SOURCE_ROOT, fileName), 'utf8'));
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new CatalogError(`Adventure metadata file data/${fileName} must contain a JSON object.`);
    }
    const records = (value as Record<string, unknown>)[collection];
    if (!Array.isArray(records))
      throw new CatalogError(`Adventure metadata file data/${fileName} has no ${collection} list.`);
    for (const record of records) {
      if (typeof record !== 'object' || record === null || Array.isArray(record)) continue;
      const source = (record as RawRecord).source;
      if (typeof source === 'string') sourceIds.add(source);
    }
  }
  return sourceIds;
}

function validateAdventureAllowlist(projectRoot: string, sourceIds: readonly string[]): void {
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new CatalogError('Adventure allowlist contains duplicate source IDs.');
  }
  const knownSourceIds = getMetadataSourceIds(projectRoot);
  const unknownSourceIds = sourceIds.filter((sourceId) => !knownSourceIds.has(sourceId));
  if (unknownSourceIds.length > 0) {
    throw new CatalogError(`Unknown adventure source IDs: ${unknownSourceIds.join(', ')}.`);
  }
}

function createCatalogRecord(domain: CatalogCollection, file: string, record: RawRecord): CatalogRecord {
  return {
    data: record,
    domain,
    edition: getString(record, 'edition'),
    file,
    id: createRecordId(domain, record),
    name: getString(record, 'name') ?? getString(record, 'abbreviation') ?? '',
    page: getNumber(record, 'page'),
    source: requireIdentityPart(record, 'source'),
    sourceRoot: file.split('/', 1)[0]!,
  };
}

function createDragonMundaneItemsRecord(file: string, value: unknown): CatalogRecord {
  return {
    data: validateDragonMundaneItems(file, value) as unknown as RawRecord,
    domain: 'lootDragonMundaneItemTable',
    file,
    id: 'lootdragonmundaneitemtable/ftd',
    name: 'Dragon Mundane Items',
    page: 72,
    source: 'FTD',
    sourceRoot: file.split('/', 1)[0]!,
  };
}

export function createCatalog(
  projectRoot: string,
  sourceRoots: readonly CatalogSourceRoot[] = [
    { name: DEFAULT_SOURCE_ROOT, path: join(projectRoot, DEFAULT_SOURCE_ROOT) },
  ],
  adventurePolicy: CatalogAdventurePolicy = { mode: 'disabled', sourceIds: [] },
): Catalog {
  if (sourceRoots.length === 0) throw new CatalogError('At least one source root must be enabled.');
  if (adventurePolicy.mode === 'allowlist') validateAdventureAllowlist(projectRoot, adventurePolicy.sourceIds);

  const records: CatalogRecord[] = [];
  const recordsById = new Map<string, CatalogRecord>();
  const manifests: CatalogManifest[] = [];

  for (const sourceRoot of sourceRoots) {
    const includeAdventureMetadata = adventurePolicy.mode !== 'disabled' && sourceRoot.name === DEFAULT_SOURCE_ROOT;
    const manifest = createCatalogManifest(projectRoot, sourceRoot.name, includeAdventureMetadata);
    manifests.push(manifest);

    for (const file of manifest.files) {
      if (file.role !== 'entity') continue;
      const relativePath = file.path.slice(`${sourceRoot.name}/`.length);
      const value: unknown = JSON.parse(readFileSync(join(sourceRoot.path, relativePath), 'utf8'));
      const entityCollections = file.collections.filter((collection) => collection.domain !== undefined);
      const standardCollections = entityCollections.filter(
        (collection) => collection.domain !== 'lootDragonMundaneItemTable',
      );
      const collections = standardCollections.map((collection) => collection.domain!);
      const metadataCollection = file.collections.find(
        (collection) => collection.domain === 'adventure' || collection.domain === 'book',
      );
      const catalogValue =
        metadataCollection === undefined
          ? value
          : {
              [metadataCollection.name]: (value as Record<string, readonly RawRecord[]>)[metadataCollection.name]!.map(
                (record) => projectAdventureMetadata(metadataCollection.domain as 'adventure' | 'book', record),
              ),
            };
      const validated = validateCollectionFile(
        file.path,
        catalogValue,
        collections,
        standardCollections.map((collection) => collection.name),
        file.collections.map((collection) => collection.name),
      );

      for (const collection of collections) {
        for (const record of validated[collection]!) {
          if (
            (collection === 'adventure' || collection === 'book') &&
            adventurePolicy.mode === 'allowlist' &&
            !adventurePolicy.sourceIds.includes(requireIdentityPart(record, 'source'))
          ) {
            continue;
          }
          const catalogRecord = createCatalogRecord(collection, file.path, record);
          const conflictingRecord = recordsById.get(catalogRecord.id);
          if (conflictingRecord !== undefined) {
            throw new CatalogError(
              `Duplicate catalog ID ${catalogRecord.id} in ${conflictingRecord.file} (${conflictingRecord.sourceRoot}) and ${file.path} (${catalogRecord.sourceRoot}).`,
            );
          }
          recordsById.set(catalogRecord.id, catalogRecord);
          records.push(catalogRecord);
        }
      }

      const dragonMundaneItems = entityCollections.find(
        (collection) => collection.domain === 'lootDragonMundaneItemTable',
      );
      if (dragonMundaneItems !== undefined && sourceRoot.name === DEFAULT_SOURCE_ROOT) {
        const fileValue = value as Record<string, unknown>;
        const catalogRecord = createDragonMundaneItemsRecord(file.path, fileValue[dragonMundaneItems.name]);
        const conflictingRecord = recordsById.get(catalogRecord.id);
        if (conflictingRecord !== undefined) {
          throw new CatalogError(
            `Duplicate catalog ID ${catalogRecord.id} in ${conflictingRecord.file} (${conflictingRecord.sourceRoot}) and ${file.path} (${catalogRecord.sourceRoot}).`,
          );
        }
        recordsById.set(catalogRecord.id, catalogRecord);
        records.push(catalogRecord);
      }
    }
  }

  const manifest = manifests[0]!;
  return {
    manifest: {
      ...manifest,
      files: manifests.flatMap((sourceManifest) => sourceManifest.files),
    },
    records,
  };
}

export function getCatalogDiagnostics(catalog: Catalog): CatalogDiagnostics {
  return {
    fileCount: catalog.manifest.files.filter((file) => file.role === 'entity').length,
    recordCount: catalog.records.length,
    sourceRoots: [...new Set(catalog.records.map((record) => record.sourceRoot))],
  };
}
