import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CATALOG_DOMAINS,
  createCatalogManifest,
  getManifestDiagnostics,
  MANIFEST_VERSION,
  ManifestError,
} from './manifest.js';

function createFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), '5etools-mcp-manifest-'));
  mkdirSync(join(root, 'data', 'class'), { recursive: true });
  writeFileSync(join(root, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
  writeFileSync(join(root, 'data', 'backgrounds.json'), '{ "background": [] }');
  writeFileSync(join(root, 'data', 'feats.json'), '{ "feat": [] }');
  writeFileSync(join(root, 'data', 'optionalfeatures.json'), '{ "optionalfeature": [] }');
  writeFileSync(join(root, 'data', 'bastions.json'), '{ "facility": [] }');
  writeFileSync(join(root, 'data', 'class', 'index.json'), '{}');
  writeFileSync(
    join(root, 'data', 'class', 'class-fixture.json'),
    '{ "class": [], "subclass": [], "classFeature": [], "subclassFeature": [] }',
  );
  return root;
}

void describe('Phase 1 manifest', () => {
  void test('classifies the current Phase 1 source files', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const manifest = createCatalogManifest(projectRoot);

    assert.equal(manifest.version, MANIFEST_VERSION);
    assert.deepEqual(manifest.enabledDomains, CATALOG_DOMAINS);
    assert.ok(manifest.files.some((file) => file.path === 'data/races.json' && file.role === 'entity'));
    assert.ok(manifest.files.some((file) => file.path === 'data/backgrounds.json' && file.role === 'entity'));
    assert.ok(manifest.files.some((file) => file.path === 'data/feats.json' && file.role === 'entity'));
    assert.ok(manifest.files.some((file) => file.path === 'data/optionalfeatures.json' && file.role === 'entity'));
    assert.ok(manifest.files.some((file) => file.path === 'data/bastions.json' && file.role === 'entity'));
    assert.ok(manifest.files.some((file) => file.path === 'data/class/index.json' && file.role === 'catalog'));
  });

  void test('accepts compatible new class source files without a manifest edit', () => {
    const root = createFixtureRoot();
    writeFileSync(join(root, 'data', 'class', 'class-new.json'), '{ "class": [] }');

    const manifest = createCatalogManifest(root);
    assert.ok(manifest.files.some((file) => file.path === 'data/class/class-new.json' && file.role === 'entity'));
    assert.deepEqual(getManifestDiagnostics(manifest).enabledDomains, CATALOG_DOMAINS);
  });

  void test('rejects missing and unclassified required source collections', () => {
    const missingCollectionRoot = createFixtureRoot();
    writeFileSync(join(missingCollectionRoot, 'data', 'races.json'), '{ "race": [] }');
    assert.throws(
      () => createCatalogManifest(missingCollectionRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('subrace'),
    );

    const unknownCollectionRoot = createFixtureRoot();
    writeFileSync(join(unknownCollectionRoot, 'data', 'class', 'class-fixture.json'), '{ "class": [], "unknown": [] }');
    assert.throws(
      () => createCatalogManifest(unknownCollectionRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('Unclassified'),
    );

    const missingFileRoot = mkdtempSync(join(tmpdir(), '5etools-mcp-manifest-missing-'));
    assert.throws(
      () => createCatalogManifest(missingFileRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('race source file'),
    );

    const missingBackgroundRoot = createFixtureRoot();
    rmSync(join(missingBackgroundRoot, 'data', 'backgrounds.json'));
    assert.throws(
      () => createCatalogManifest(missingBackgroundRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('background source file'),
    );

    const missingFeatRoot = createFixtureRoot();
    rmSync(join(missingFeatRoot, 'data', 'feats.json'));
    assert.throws(
      () => createCatalogManifest(missingFeatRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('feat source file'),
    );

    const missingOptionalFeatureRoot = createFixtureRoot();
    rmSync(join(missingOptionalFeatureRoot, 'data', 'optionalfeatures.json'));
    assert.throws(
      () => createCatalogManifest(missingOptionalFeatureRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('optional feature source file'),
    );

    const missingBastionRoot = createFixtureRoot();
    rmSync(join(missingBastionRoot, 'data', 'bastions.json'));
    assert.throws(
      () => createCatalogManifest(missingBastionRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('bastion source file'),
    );

    const missingClassDirectoryRoot = mkdtempSync(join(tmpdir(), '5etools-mcp-manifest-no-class-directory-'));
    mkdirSync(join(missingClassDirectoryRoot, 'data'));
    writeFileSync(join(missingClassDirectoryRoot, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
    writeFileSync(join(missingClassDirectoryRoot, 'data', 'backgrounds.json'), '{ "background": [] }');
    writeFileSync(join(missingClassDirectoryRoot, 'data', 'feats.json'), '{ "feat": [] }');
    writeFileSync(join(missingClassDirectoryRoot, 'data', 'optionalfeatures.json'), '{ "optionalfeature": [] }');
    writeFileSync(join(missingClassDirectoryRoot, 'data', 'bastions.json'), '{ "facility": [] }');
    assert.throws(
      () => createCatalogManifest(missingClassDirectoryRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('class source directory'),
    );

    const noClassEntityRoot = createFixtureRoot();
    writeFileSync(join(noClassEntityRoot, 'data', 'class', 'class-fixture.json'), '{}');
    assert.throws(
      () => createCatalogManifest(noClassEntityRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('class collection'),
    );

    const noClassFileRoot = createFixtureRoot();
    rmSync(join(noClassFileRoot, 'data', 'class', 'class-fixture.json'));
    assert.throws(
      () => createCatalogManifest(noClassFileRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('No class entity files'),
    );
  });

  void test('rejects invalid entity JSON', () => {
    const nonObjectRoot = createFixtureRoot();
    writeFileSync(join(nonObjectRoot, 'data', 'races.json'), '[]');
    assert.throws(
      () => createCatalogManifest(nonObjectRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('JSON object'),
    );

    const malformedRoot = createFixtureRoot();
    writeFileSync(join(malformedRoot, 'data', 'races.json'), '{');
    assert.throws(
      () => createCatalogManifest(malformedRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('Unable to read JSON file'),
    );
  });
});
