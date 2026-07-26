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

export const PHASE_ONE_DOMAINS = ['race', 'subrace', 'class', 'subclass', 'classFeature', 'subclassFeature'] as const;

export type StableDomain = (typeof STABLE_DOMAINS)[number];
export type PhaseOneDomain = (typeof PHASE_ONE_DOMAINS)[number];
export type ManifestFileRole = 'catalog' | 'entity' | 'generated-support' | 'presentation';

export interface ManifestCollection {
  readonly domain?: PhaseOneDomain;
  readonly name: string;
}

export interface ManifestFile {
  readonly collections: readonly ManifestCollection[];
  readonly path: string;
  readonly role: ManifestFileRole;
}

export interface PhaseOneManifest {
  readonly enabledDomains: readonly PhaseOneDomain[];
  readonly files: readonly ManifestFile[];
  readonly stableDomains: readonly StableDomain[];
  readonly version: typeof MANIFEST_VERSION;
}

export interface ManifestDiagnostics {
  readonly enabledDomains: readonly PhaseOneDomain[];
  readonly files: readonly Pick<ManifestFile, 'path' | 'role'>[];
  readonly version: typeof MANIFEST_VERSION;
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

const RACES_PATH = 'data/races.json';
const CLASS_DIRECTORY_PATH = 'data/class';
const CLASS_INDEX_PATH = 'data/class/index.json';
const RACE_COLLECTIONS = new Map<string, PhaseOneDomain>([
  ['race', 'race'],
  ['subrace', 'subrace'],
]);
const CLASS_COLLECTIONS = new Map<string, PhaseOneDomain>([
  ['class', 'class'],
  ['subclass', 'subclass'],
  ['classFeature', 'classFeature'],
  ['subclassFeature', 'subclassFeature'],
]);

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
  collectionDomains: ReadonlyMap<string, PhaseOneDomain>,
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
  requiredDomains: readonly PhaseOneDomain[],
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

export function createPhaseOneManifest(projectRoot: string): PhaseOneManifest {
  const racesPath = join(projectRoot, RACES_PATH);
  const classDirectory = join(projectRoot, CLASS_DIRECTORY_PATH);
  const classIndexPath = join(projectRoot, CLASS_INDEX_PATH);
  requireFile(racesPath, 'race source file');
  if (!existsSync(classDirectory) || !statSync(classDirectory).isDirectory()) {
    throw new ManifestError(`Required class source directory is missing: ${classDirectory}`);
  }
  requireFile(classIndexPath, 'class catalog');

  const raceFile = classifyEntityFile(projectRoot, racesPath, RACE_COLLECTIONS);
  requireDomains([raceFile], ['race', 'subrace'], 'race');

  const files: ManifestFile[] = [raceFile];
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
  requireDomains(classEntityFiles, PHASE_ONE_DOMAINS.slice(2), 'class');

  return {
    enabledDomains: PHASE_ONE_DOMAINS,
    files,
    stableDomains: STABLE_DOMAINS,
    version: MANIFEST_VERSION,
  };
}

export function getManifestDiagnostics(manifest: PhaseOneManifest): ManifestDiagnostics {
  return {
    enabledDomains: manifest.enabledDomains,
    files: manifest.files.map(({ path, role }) => ({ path, role })),
    version: manifest.version,
  };
}
