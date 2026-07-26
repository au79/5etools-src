import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createPhaseOneManifest,
  getManifestDiagnostics,
  MANIFEST_VERSION,
  ManifestError,
  PHASE_ONE_DOMAINS,
} from './manifest.js';

function createFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), '5etools-mcp-manifest-'));
  mkdirSync(join(root, 'data', 'class'), { recursive: true });
  writeFileSync(join(root, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
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
    const manifest = createPhaseOneManifest(projectRoot);

    assert.equal(manifest.version, MANIFEST_VERSION);
    assert.deepEqual(manifest.enabledDomains, PHASE_ONE_DOMAINS);
    assert.ok(manifest.files.some((file) => file.path === 'data/races.json' && file.role === 'entity'));
    assert.ok(manifest.files.some((file) => file.path === 'data/class/index.json' && file.role === 'catalog'));
  });

  void test('accepts compatible new class source files without a manifest edit', () => {
    const root = createFixtureRoot();
    writeFileSync(join(root, 'data', 'class', 'class-new.json'), '{ "class": [] }');

    const manifest = createPhaseOneManifest(root);
    assert.ok(manifest.files.some((file) => file.path === 'data/class/class-new.json' && file.role === 'entity'));
    assert.deepEqual(getManifestDiagnostics(manifest).enabledDomains, PHASE_ONE_DOMAINS);
  });

  void test('rejects missing and unclassified required source collections', () => {
    const missingCollectionRoot = createFixtureRoot();
    writeFileSync(join(missingCollectionRoot, 'data', 'races.json'), '{ "race": [] }');
    assert.throws(
      () => createPhaseOneManifest(missingCollectionRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('subrace'),
    );

    const unknownCollectionRoot = createFixtureRoot();
    writeFileSync(join(unknownCollectionRoot, 'data', 'class', 'class-fixture.json'), '{ "class": [], "unknown": [] }');
    assert.throws(
      () => createPhaseOneManifest(unknownCollectionRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('Unclassified'),
    );

    const missingFileRoot = mkdtempSync(join(tmpdir(), '5etools-mcp-manifest-missing-'));
    assert.throws(
      () => createPhaseOneManifest(missingFileRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('race source file'),
    );

    const missingClassDirectoryRoot = mkdtempSync(join(tmpdir(), '5etools-mcp-manifest-no-class-directory-'));
    mkdirSync(join(missingClassDirectoryRoot, 'data'));
    writeFileSync(join(missingClassDirectoryRoot, 'data', 'races.json'), '{ "race": [], "subrace": [] }');
    assert.throws(
      () => createPhaseOneManifest(missingClassDirectoryRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('class source directory'),
    );

    const noClassEntityRoot = createFixtureRoot();
    writeFileSync(join(noClassEntityRoot, 'data', 'class', 'class-fixture.json'), '{}');
    assert.throws(
      () => createPhaseOneManifest(noClassEntityRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('class collection'),
    );

    const noClassFileRoot = createFixtureRoot();
    rmSync(join(noClassFileRoot, 'data', 'class', 'class-fixture.json'));
    assert.throws(
      () => createPhaseOneManifest(noClassFileRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('No class entity files'),
    );
  });

  void test('rejects invalid entity JSON', () => {
    const nonObjectRoot = createFixtureRoot();
    writeFileSync(join(nonObjectRoot, 'data', 'races.json'), '[]');
    assert.throws(
      () => createPhaseOneManifest(nonObjectRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('JSON object'),
    );

    const malformedRoot = createFixtureRoot();
    writeFileSync(join(malformedRoot, 'data', 'races.json'), '{');
    assert.throws(
      () => createPhaseOneManifest(malformedRoot),
      (error: unknown) => error instanceof ManifestError && error.message.includes('Unable to read JSON file'),
    );
  });
});
