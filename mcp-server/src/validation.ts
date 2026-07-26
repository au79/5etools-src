import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z, type ZodType } from 'zod';

import { createPhaseOneManifest } from './manifest.js';

export const PHASE_ONE_COLLECTIONS = [
  'race',
  'subrace',
  'class',
  'subclass',
  'classFeature',
  'subclassFeature',
] as const;

export type PhaseOneCollection = (typeof PHASE_ONE_COLLECTIONS)[number];

export interface ValidationFailure {
  readonly collection: PhaseOneCollection;
  readonly file: string;
  readonly path: readonly PropertyKey[];
  readonly recordName?: string | undefined;
  readonly recordSource?: string | undefined;
  readonly message: string;
}

export class ValidationError extends Error {
  constructor(readonly failures: readonly ValidationFailure[]) {
    super(
      failures
        .map((failure) => `${failure.file} ${failure.collection} ${failure.path.join('.')}: ${failure.message}`)
        .join('\n'),
    );
    this.name = 'ValidationError';
  }
}

export interface ValidationResult {
  readonly files: readonly string[];
}

type RawRecord = Readonly<Record<string, unknown>>;

const JSON_VALUE_SCHEMA: ZodType<unknown> = z.json();
const ENTRY_SCHEMA: ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z
      .object({
        attributes: JSON_VALUE_SCHEMA.optional(),
        caption: JSON_VALUE_SCHEMA.optional(),
        classFeature: JSON_VALUE_SCHEMA.optional(),
        colLabels: JSON_VALUE_SCHEMA.optional(),
        colStyles: JSON_VALUE_SCHEMA.optional(),
        columns: JSON_VALUE_SCHEMA.optional(),
        consumes: JSON_VALUE_SCHEMA.optional(),
        count: JSON_VALUE_SCHEMA.optional(),
        data: JSON_VALUE_SCHEMA.optional(),
        entries: z.array(ENTRY_SCHEMA).optional(),
        entry: JSON_VALUE_SCHEMA.optional(),
        feat: JSON_VALUE_SCHEMA.optional(),
        footnotes: JSON_VALUE_SCHEMA.optional(),
        genTables: JSON_VALUE_SCHEMA.optional(),
        isRequiredOption: JSON_VALUE_SCHEMA.optional(),
        items: z.array(ENTRY_SCHEMA).optional(),
        name: z.string().optional(),
        optionalfeature: JSON_VALUE_SCHEMA.optional(),
        overwrite: JSON_VALUE_SCHEMA.optional(),
        page: JSON_VALUE_SCHEMA.optional(),
        prerequisite: JSON_VALUE_SCHEMA.optional(),
        preserve: JSON_VALUE_SCHEMA.optional(),
        reprintedAs: JSON_VALUE_SCHEMA.optional(),
        rows: JSON_VALUE_SCHEMA.optional(),
        source: JSON_VALUE_SCHEMA.optional(),
        style: JSON_VALUE_SCHEMA.optional(),
        subclassFeature: JSON_VALUE_SCHEMA.optional(),
        tableInclude: JSON_VALUE_SCHEMA.optional(),
        tag: JSON_VALUE_SCHEMA.optional(),
        type: z.string(),
      })
      .strict(),
  ]),
);
const REQUIRED_STRING_FIELDS = new Set(['source', 'className', 'classSource', 'subclassShortName', 'subclassSource']);
const REQUIRED_NUMBER_FIELDS = new Set(['level']);
const NUMBER_FIELDS = new Set(['page', 'header', 'blindsight', 'darkvision']);
const ARRAY_FIELDS = new Set(['entries']);
const OBJECT_FIELDS = new Set(['_copy', 'overwrite']);

const COLLECTION_FIELDS: Readonly<Record<PhaseOneCollection, readonly string[]>> = {
  race: [
    '_copy',
    '_versions',
    'ability',
    'additionalSources',
    'additionalSpells',
    'age',
    'alias',
    'armorProficiencies',
    'basicRules',
    'basicRules2024',
    'blindsight',
    'conditionImmune',
    'creatureTypeTags',
    'creatureTypes',
    'darkvision',
    'edition',
    'entries',
    'feats',
    'hasFluff',
    'hasFluffImages',
    'heightAndWeight',
    'immune',
    'languageProficiencies',
    'lineage',
    'name',
    'otherSources',
    'page',
    'reprintedAs',
    'resist',
    'size',
    'sizeEntry',
    'skillProficiencies',
    'soundClip',
    'source',
    'speed',
    'srd',
    'srd52',
    'toolProficiencies',
    'traitTags',
    'vulnerable',
    'weaponProficiencies',
  ],
  subrace: [
    '_copy',
    '_versions',
    'ability',
    'additionalSpells',
    'age',
    'alias',
    'armorProficiencies',
    'basicRules',
    'darkvision',
    'entries',
    'feats',
    'hasFluff',
    'hasFluffImages',
    'heightAndWeight',
    'languageProficiencies',
    'name',
    'otherSources',
    'overwrite',
    'page',
    'raceName',
    'raceSource',
    'reprintedAs',
    'resist',
    'skillProficiencies',
    'skillToolLanguageProficiencies',
    'soundClip',
    'source',
    'speed',
    'srd',
    'toolProficiencies',
    'traitTags',
    'weaponProficiencies',
  ],
  class: [
    'additionalSpells',
    'basicRules',
    'basicRules2024',
    'cantripProgression',
    'casterProgression',
    'classFeatures',
    'classTableGroups',
    'edition',
    'featProgression',
    'hasFluff',
    'hasFluffImages',
    'hd',
    'isSidekick',
    'multiclassing',
    'name',
    'optionalfeatureProgression',
    'otherSources',
    'page',
    'preparedSpells',
    'preparedSpellsChange',
    'preparedSpellsProgression',
    'primaryAbility',
    'proficiency',
    'reprintedAs',
    'source',
    'spellcastingAbility',
    'spellsKnownProgression',
    'spellsKnownProgressionFixed',
    'spellsKnownProgressionFixedAllowLowerLevel',
    'spellsKnownProgressionFixedByLevel',
    'srd',
    'srd52',
    'startingEquipment',
    'startingProficiencies',
    'subclassTitle',
  ],
  subclass: [
    '_copy',
    'additionalSpells',
    'basicRules',
    'basicRules2024',
    'cantripProgression',
    'casterProgression',
    'className',
    'classSource',
    'edition',
    'featProgression',
    'fluff',
    'hasFluff',
    'hasFluffImages',
    'isReprinted',
    'name',
    'optionalfeatureProgression',
    'otherSources',
    'page',
    'preparedSpellsChange',
    'preparedSpellsProgression',
    'reprintedAs',
    'shortName',
    'source',
    'spellcastingAbility',
    'spellsKnownProgression',
    'srd',
    'srd52',
    'subclassFeatures',
    'subclassTableGroups',
  ],
  classFeature: [
    'basicRules',
    'basicRules2024',
    'className',
    'classSource',
    'consumes',
    'entries',
    'header',
    'isClassFeatureVariant',
    'level',
    'name',
    'otherSources',
    'page',
    'source',
    'srd',
    'srd52',
    'type',
  ],
  subclassFeature: [
    '_copy',
    'basicRules',
    'basicRules2024',
    'className',
    'classSource',
    'consumes',
    'entries',
    'header',
    'isClassFeatureVariant',
    'level',
    'name',
    'otherSources',
    'page',
    'source',
    'srd',
    'srd52',
    'subclassShortName',
    'subclassSource',
    'type',
  ],
};

function getFieldSchema(collection: PhaseOneCollection, field: string): ZodType<unknown> {
  if (field === 'name') return collection === 'subrace' ? z.string().optional() : z.string();
  if (REQUIRED_STRING_FIELDS.has(field)) return z.string();
  if (field === 'raceName' || field === 'raceSource') return z.string().optional();
  if (REQUIRED_NUMBER_FIELDS.has(field)) return z.number();
  if (NUMBER_FIELDS.has(field)) return z.number().optional();
  if (ARRAY_FIELDS.has(field)) return z.array(ENTRY_SCHEMA).optional();
  if (OBJECT_FIELDS.has(field)) return z.object({}).catchall(JSON_VALUE_SCHEMA).optional();
  return JSON_VALUE_SCHEMA.optional();
}

function createRecordSchema(collection: PhaseOneCollection): ZodType<RawRecord> {
  const shape = Object.fromEntries(
    COLLECTION_FIELDS[collection].map((field) => [field, getFieldSchema(collection, field)]),
  );
  return z.object(shape).strict();
}

const RECORD_SCHEMAS = Object.fromEntries(
  PHASE_ONE_COLLECTIONS.map((collection) => [collection, createRecordSchema(collection)]),
) as Readonly<Record<PhaseOneCollection, ZodType<RawRecord>>>;

function getRecordIdentity(value: unknown): {
  readonly name?: string | undefined;
  readonly source?: string | undefined;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    name: typeof record.name === 'string' ? record.name : undefined,
    source: typeof record.source === 'string' ? record.source : undefined,
  };
}

export function validateCollectionRecords(
  file: string,
  collection: PhaseOneCollection,
  value: unknown,
): readonly RawRecord[] {
  const recordsResult = z.array(RECORD_SCHEMAS[collection]).safeParse(value);
  if (recordsResult.success) return value as readonly RawRecord[];

  const failures = recordsResult.error.issues.flatMap((issue) => {
    const record = getRecordIdentity(Array.isArray(value) ? value[issue.path[0] as number] : undefined);
    const paths = issue.code === 'unrecognized_keys' ? issue.keys.map((key) => [...issue.path, key]) : [issue.path];
    return paths.map((path) => ({
      collection,
      file,
      message: issue.message,
      path,
      recordName: record.name,
      recordSource: record.source,
    }));
  });
  throw new ValidationError(failures);
}

export function validateCollectionFile(
  file: string,
  value: unknown,
  collections: readonly PhaseOneCollection[],
): Readonly<Record<PhaseOneCollection, readonly RawRecord[] | undefined>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(
      collections.map((collection) => ({ collection, file, message: 'Expected a JSON object.', path: [] })),
    );
  }
  const fileValue = value as Record<string, unknown>;
  const allowedKeys = new Set(['_meta', ...collections]);
  const unknownKeys = Object.keys(fileValue).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new ValidationError(
      unknownKeys.map((key) => ({
        collection: collections[0]!,
        file,
        message: 'Unrecognized top-level collection.',
        path: [key],
      })),
    );
  }
  const missingCollections = collections.filter((collection) => fileValue[collection] === undefined);
  if (missingCollections.length > 0) {
    throw new ValidationError(
      missingCollections.map((collection) => ({
        collection,
        file,
        message: 'Required collection is missing.',
        path: [collection],
      })),
    );
  }

  return Object.fromEntries(
    collections.map((collection) => [collection, validateCollectionRecords(file, collection, fileValue[collection])]),
  ) as Readonly<Record<PhaseOneCollection, readonly RawRecord[] | undefined>>;
}

export function validatePhaseOneProjectRoot(projectRoot: string): ValidationResult {
  const manifest = createPhaseOneManifest(projectRoot);
  const files: string[] = [];

  for (const file of manifest.files) {
    if (file.role !== 'entity') continue;

    const value: unknown = JSON.parse(readFileSync(join(projectRoot, file.path), 'utf8'));
    const collections = file.collections.flatMap((collection) => collection.domain ?? []);
    validateCollectionFile(file.path, value, collections);
    files.push(file.path);
  }

  return { files };
}
