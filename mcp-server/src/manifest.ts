import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const MANIFEST_VERSION = '1';

export const STABLE_DOMAINS = [
  'character',
  'class',
  'spell',
  'item',
  'creature',
  'rule',
  'adventure',
  'book',
  'worldbuilding',
  'dm-tool',
] as const;

export const CATALOG_DOMAINS = [
  'race',
  'subrace',
  'background',
  'feat',
  'optionalfeature',
  'facility',
  'class',
  'subclass',
  'classFeature',
  'subclassFeature',
] as const;

export type StableDomain = (typeof STABLE_DOMAINS)[number];
export type CatalogDomain = (typeof CATALOG_DOMAINS)[number];
export type ManifestFileRole = 'catalog' | 'entity' | 'generated-support' | 'presentation';

export interface ManifestCollection {
  readonly domain?: CatalogDomain;
  readonly name: string;
}

export interface ManifestFile {
  readonly collections: readonly ManifestCollection[];
  readonly path: string;
  readonly role: ManifestFileRole;
}

export interface CatalogManifest {
  readonly enabledDomains: readonly CatalogDomain[];
  readonly files: readonly ManifestFile[];
  readonly stableDomains: readonly StableDomain[];
  readonly version: typeof MANIFEST_VERSION;
}

export interface ManifestDiagnostics {
  readonly enabledDomains: readonly CatalogDomain[];
  readonly files: readonly Pick<ManifestFile, 'path' | 'role'>[];
  readonly version: typeof MANIFEST_VERSION;
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

const RACE_COLLECTIONS = new Map<string, CatalogDomain>([
  ['race', 'race'],
  ['subrace', 'subrace'],
]);
const CLASS_COLLECTIONS = new Map<string, CatalogDomain>([
  ['class', 'class'],
  ['subclass', 'subclass'],
  ['classFeature', 'classFeature'],
  ['subclassFeature', 'subclassFeature'],
]);
const BACKGROUND_COLLECTIONS = new Map<string, CatalogDomain>([['background', 'background']]);
const FEAT_COLLECTIONS = new Map<string, CatalogDomain>([['feat', 'feat']]);
const OPTIONAL_FEATURE_COLLECTIONS = new Map<string, CatalogDomain>([['optionalfeature', 'optionalfeature']]);
const BASTION_COLLECTIONS = new Map<string, CatalogDomain>([['facility', 'facility']]);

export const DEFAULT_SOURCE_ROOT = 'data';

function toManifestPath(projectRoot: string, path: string): string {
  return relative(projectRoot, path).replaceAll('\\', '/');
}

function readObject(path: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ManifestError(`Expected ${path} to contain a JSON object.`);
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ManifestError) throw error;
    throw new ManifestError(`Unable to read JSON file ${path}.`);
  }
}

function classifyEntityFile(
  projectRoot: string,
  path: string,
  collectionDomains: ReadonlyMap<string, CatalogDomain>,
): ManifestFile {
  const value = readObject(path);
  const collections: ManifestCollection[] = [];

  for (const collection of Object.keys(value)) {
    if (collection === '_meta') {
      collections.push({ name: collection });
      continue;
    }

    const domain = collectionDomains.get(collection);
    if (domain === undefined) {
      throw new ManifestError(`Unclassified top-level collection ${JSON.stringify(collection)} in ${path}.`);
    }
    collections.push({ domain, name: collection });
  }

  return { collections, path: toManifestPath(projectRoot, path), role: 'entity' };
}

function requireFile(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) throw new ManifestError(`Required ${label} is missing: ${path}`);
}

function requireDomains(
  files: readonly ManifestFile[],
  requiredDomains: readonly CatalogDomain[],
  label: string,
): void {
  const presentDomains = new Set(
    files.flatMap((file) => file.collections.flatMap((collection) => collection.domain ?? [])),
  );
  for (const domain of requiredDomains) {
    if (!presentDomains.has(domain)) throw new ManifestError(`Required ${label} collection is missing: ${domain}`);
  }
}

function classifyClassCompanion(projectRoot: string, path: string, fileName: string): ManifestFile {
  if (fileName === 'index.json') {
    return { collections: [], path: toManifestPath(projectRoot, path), role: 'catalog' };
  }
  if (fileName === 'foundry.json') {
    return { collections: [], path: toManifestPath(projectRoot, path), role: 'generated-support' };
  }
  return { collections: [], path: toManifestPath(projectRoot, path), role: 'presentation' };
}

export function createCatalogManifest(projectRoot: string, sourceRoot = DEFAULT_SOURCE_ROOT): CatalogManifest {
  const sourcePath = join(projectRoot, sourceRoot);
  const racesPath = join(sourcePath, 'races.json');
  const backgroundsPath = join(sourcePath, 'backgrounds.json');
  const featsPath = join(sourcePath, 'feats.json');
  const optionalFeaturesPath = join(sourcePath, 'optionalfeatures.json');
  const bastionsPath = join(sourcePath, 'bastions.json');
  const classDirectory = join(sourcePath, 'class');
  const classIndexPath = join(sourcePath, 'class', 'index.json');
  requireFile(racesPath, 'race source file');
  requireFile(backgroundsPath, 'background source file');
  requireFile(featsPath, 'feat source file');
  requireFile(optionalFeaturesPath, 'optional feature source file');
  requireFile(bastionsPath, 'bastion source file');
  if (!existsSync(classDirectory) || !statSync(classDirectory).isDirectory()) {
    throw new ManifestError(`Required class source directory is missing: ${classDirectory}`);
  }
  requireFile(classIndexPath, 'class catalog');

  const raceFile = classifyEntityFile(projectRoot, racesPath, RACE_COLLECTIONS);
  const backgroundFile = classifyEntityFile(projectRoot, backgroundsPath, BACKGROUND_COLLECTIONS);
  const featFile = classifyEntityFile(projectRoot, featsPath, FEAT_COLLECTIONS);
  const optionalFeatureFile = classifyEntityFile(projectRoot, optionalFeaturesPath, OPTIONAL_FEATURE_COLLECTIONS);
  const bastionFile = classifyEntityFile(projectRoot, bastionsPath, BASTION_COLLECTIONS);
  requireDomains([raceFile], ['race', 'subrace'], 'race');
  requireDomains([backgroundFile], ['background'], 'background');
  requireDomains([featFile], ['feat'], 'feat');
  requireDomains([optionalFeatureFile], ['optionalfeature'], 'optional feature');
  requireDomains([bastionFile], ['facility'], 'bastion');

  const files: ManifestFile[] = [raceFile, backgroundFile, featFile, optionalFeatureFile, bastionFile];
  const classEntityFiles: ManifestFile[] = [];
  for (const fileName of readdirSync(classDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()) {
    const path = join(classDirectory, fileName);
    if (fileName.startsWith('class-')) {
      const file = classifyEntityFile(projectRoot, path, CLASS_COLLECTIONS);
      classEntityFiles.push(file);
      files.push(file);
      continue;
    }
    files.push(classifyClassCompanion(projectRoot, path, fileName));
  }

  if (classEntityFiles.length === 0) throw new ManifestError(`No class entity files found in ${classDirectory}.`);
  requireDomains(classEntityFiles, CATALOG_DOMAINS.slice(6), 'class');

  return {
    enabledDomains: CATALOG_DOMAINS,
    files,
    stableDomains: STABLE_DOMAINS,
    version: MANIFEST_VERSION,
  };
}

export function getManifestDiagnostics(manifest: CatalogManifest): ManifestDiagnostics {
  return {
    enabledDomains: manifest.enabledDomains,
    files: manifest.files.map(({ path, role }) => ({ path, role })),
    version: manifest.version,
  };
}
