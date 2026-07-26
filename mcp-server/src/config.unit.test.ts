import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';

import { CONFIG_FILE_NAME, ConfigurationError, getConfigurationDiagnostics, resolveConfiguration } from './config.js';

function createFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), '5etools-mcp-config-'));
  mkdirSync(join(root, 'data'));
  mkdirSync(join(root, 'prerelease'));
  mkdirSync(join(root, 'homebrew'));
  return root;
}

void test('defaults to the enclosing project root and primary data source', () => {
  const configuration = resolveConfiguration({ argv: [], environment: {} });

  assert.deepEqual(
    configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
    ['data'],
  );
  assert.deepEqual(configuration.validationRollout, ['races', 'classes']);
  assert.equal(configuration.adventure.mode, 'disabled');
  assert.equal(configuration.log.pretty, false);
});

void test('applies CLI, environment, config, and defaults in precedence order', () => {
  const root = createFixtureRoot();
  writeFileSync(
    join(root, CONFIG_FILE_NAME),
    `// Configuration values are overridden by environment and CLI options.\n{
  "sources": ["homebrew"],
  "adventures": { "mode": "all" },
  "log": { "level": "debug", "pretty": true },
  "validationRollout": ["classes"]
}\n`,
  );

  const configuration = resolveConfiguration({
    argv: ['--root', root, '--sources', 'data,prerelease', '--adventures', 'allowlist', '--adventure-source', 'LMoP'],
    environment: {
      MCP_5ETOOLS_LOG_LEVEL: 'warn',
      MCP_5ETOOLS_LOG_PRETTY: 'false',
      MCP_5ETOOLS_SOURCES: 'prerelease',
      MCP_5ETOOLS_VALIDATION_ROLLOUT: 'races',
    },
  });

  assert.deepEqual(
    configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
    ['data', 'prerelease'],
  );
  assert.deepEqual(configuration.adventure, { mode: 'allowlist', sourceIds: ['LMoP'] });
  assert.deepEqual(configuration.log, { level: 'warn', pretty: false });
  assert.deepEqual(configuration.validationRollout, ['races']);
  assert.deepEqual(configuration.warnings, ['Adventure content is enabled for allowlisted source IDs: LMoP.']);
});

void test('supports an alternate fixture root and safe diagnostics', () => {
  const root = createFixtureRoot();
  const configuration = resolveConfiguration({ argv: ['--root', root, '--sources', 'data,homebrew'], environment: {} });
  const normalizedRoot = realpathSync(root);

  assert.equal(configuration.projectRoot, normalizedRoot);
  assert.deepEqual(getConfigurationDiagnostics(configuration), {
    adventure: { mode: 'disabled', sourceIds: [] },
    configPath: undefined,
    log: { level: 'info', pretty: false },
    projectRoot: normalizedRoot,
    sourceRoots: ['data', 'homebrew'],
    validationRollout: ['races', 'classes'],
    warnings: [],
  });
});

void test('resolves CLI paths from the working directory and config paths from the config file', () => {
  const root = createFixtureRoot();
  const parent = dirname(root);
  const configuration = resolveConfiguration({
    argv: ['--root', basename(root)],
    environment: {},
    workingDirectory: parent,
  });

  assert.equal(configuration.projectRoot, realpathSync(root));

  writeFileSync(join(root, CONFIG_FILE_NAME), '{ "root": "." }');
  assert.equal(
    resolveConfiguration({ argv: [], defaultProjectRoot: root, environment: {}, workingDirectory: parent }).projectRoot,
    realpathSync(root),
  );
});

void test('parses all CLI and environment configuration options', () => {
  const root = createFixtureRoot();
  const configPath = join(root, CONFIG_FILE_NAME);
  writeFileSync(configPath, '{}');

  const cliConfiguration = resolveConfiguration({
    argv: [
      '--root',
      root,
      '--config',
      configPath,
      '--sources',
      'data,homebrew',
      '--adventures',
      'all',
      '--log-level',
      'error',
      '--log-pretty',
      '--validation-rollout',
      'races,classes',
    ],
    environment: {},
  });
  assert.deepEqual(cliConfiguration.log, { level: 'error', pretty: true });
  assert.deepEqual(cliConfiguration.warnings, ['Adventure content is enabled for all adventure source IDs.']);

  const environmentConfiguration = resolveConfiguration({
    argv: [],
    environment: {
      MCP_5ETOOLS_ROOT: root,
      MCP_5ETOOLS_CONFIG: configPath,
      MCP_5ETOOLS_SOURCES: 'data,prerelease',
      MCP_5ETOOLS_ADVENTURES: 'allowlist',
      MCP_5ETOOLS_ADVENTURE_SOURCES: 'LMoP,CoS',
      MCP_5ETOOLS_LOG_LEVEL: 'debug',
      MCP_5ETOOLS_LOG_PRETTY: 'true',
      MCP_5ETOOLS_VALIDATION_ROLLOUT: 'classes',
    },
  });
  assert.deepEqual(environmentConfiguration.adventure, { mode: 'allowlist', sourceIds: ['LMoP', 'CoS'] });
  assert.deepEqual(environmentConfiguration.log, { level: 'debug', pretty: true });
  assert.deepEqual(environmentConfiguration.validationRollout, ['classes']);

  assert.equal(resolveConfiguration({ argv: ['--root', root, '--no-log-pretty'], environment: {} }).log.pretty, false);

  writeFileSync(join(root, CONFIG_FILE_NAME), '{ "adventures": { "mode": "allowlist", "sourceIds": ["LMoP"] } }');
  assert.deepEqual(resolveConfiguration({ argv: ['--root', root], environment: {} }).adventure, {
    mode: 'allowlist',
    sourceIds: ['LMoP'],
  });
});

void test('uses config-file values when they are not overridden', () => {
  const root = createFixtureRoot();
  writeFileSync(
    join(root, CONFIG_FILE_NAME),
    '{ "sources": ["homebrew"], "adventures": { "mode": "all" }, "log": { "level": "debug", "pretty": true }, "validationRollout": ["classes"] }',
  );

  const configuration = resolveConfiguration({ argv: ['--root', root], environment: {} });
  assert.deepEqual(
    configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
    ['homebrew'],
  );
  assert.deepEqual(configuration.adventure, { mode: 'all', sourceIds: [] });
  assert.deepEqual(configuration.log, { level: 'debug', pretty: true });
  assert.deepEqual(configuration.validationRollout, ['classes']);
});

void test('rejects malformed and contradictory configuration', () => {
  const root = createFixtureRoot();
  writeFileSync(join(root, CONFIG_FILE_NAME), '{ "unknown": true }');
  assert.throws(
    () => resolveConfiguration({ argv: ['--root', root], environment: {} }),
    (error: unknown) => error instanceof ConfigurationError && error.message.includes('Invalid configuration'),
  );

  assert.throws(
    () => resolveConfiguration({ argv: ['--root', createFixtureRoot(), '--adventures', 'allowlist'], environment: {} }),
    (error: unknown) => error instanceof ConfigurationError && error.message.includes('requires at least one'),
  );
  assert.throws(
    () =>
      resolveConfiguration({
        argv: ['--root', createFixtureRoot(), '--adventures', 'all', '--adventure-source', 'LMoP'],
        environment: {},
      }),
    (error: unknown) =>
      error instanceof ConfigurationError && error.message.includes('only valid when adventure mode is allowlist'),
  );
  assert.throws(
    () => resolveConfiguration({ argv: ['--root', createFixtureRoot(), '--sources', 'data,data'], environment: {} }),
    (error: unknown) => error instanceof ConfigurationError && error.message.includes('duplicate'),
  );
  assert.throws(
    () => resolveConfiguration({ argv: ['--root', join(createFixtureRoot(), 'missing')], environment: {} }),
    (error: unknown) => error instanceof ConfigurationError && error.message.includes('does not exist'),
  );

  const fileRoot = join(createFixtureRoot(), 'not-a-directory');
  writeFileSync(fileRoot, 'not a directory');
  assert.throws(
    () => resolveConfiguration({ argv: ['--root', fileRoot], environment: {} }),
    (error: unknown) => error instanceof ConfigurationError && error.message.includes('not a directory'),
  );

  const outsideConfig = join(createFixtureRoot(), 'outside.jsonc');
  writeFileSync(outsideConfig, '{}');
  assert.throws(
    () => resolveConfiguration({ argv: ['--root', createFixtureRoot(), '--config', outsideConfig], environment: {} }),
    (error: unknown) =>
      error instanceof ConfigurationError && error.message.includes('inside the selected project root'),
  );

  const sourceRoot = createFixtureRoot();
  const outsideSource = createFixtureRoot();
  rmSync(join(sourceRoot, 'homebrew'), { recursive: true });
  symlinkSync(outsideSource, join(sourceRoot, 'homebrew'));
  assert.throws(
    () => resolveConfiguration({ argv: ['--root', sourceRoot, '--sources', 'homebrew'], environment: {} }),
    (error: unknown) =>
      error instanceof ConfigurationError && error.message.includes('inside the selected project root'),
  );
});

void test('rejects malformed option, environment, and JSONC input', () => {
  const root = createFixtureRoot();
  const throwsConfigurationError = (argv: readonly string[], environment: NodeJS.ProcessEnv = {}): void => {
    assert.throws(() => resolveConfiguration({ argv: ['--root', root, ...argv], environment }), ConfigurationError);
  };

  throwsConfigurationError(['--config']);
  throwsConfigurationError(['--sources', 'data,']);
  throwsConfigurationError(['--sources', 'unknown']);
  throwsConfigurationError(['--adventures', 'unknown']);
  throwsConfigurationError(['--adventure-source', '--log-level', 'info']);
  throwsConfigurationError(['--log-level', 'verbose']);
  throwsConfigurationError(['--validation-rollout', 'spells']);
  throwsConfigurationError(['--unknown']);
  throwsConfigurationError([], { MCP_5ETOOLS_SOURCES: 'data,' });
  throwsConfigurationError([], { MCP_5ETOOLS_ADVENTURES: 'unknown' });
  throwsConfigurationError([], { MCP_5ETOOLS_LOG_LEVEL: 'verbose' });
  throwsConfigurationError([], { MCP_5ETOOLS_LOG_PRETTY: 'yes' });
  throwsConfigurationError([], { MCP_5ETOOLS_VALIDATION_ROLLOUT: 'spells' });

  throwsConfigurationError(['--config', join(root, 'missing.jsonc')]);
  writeFileSync(join(root, CONFIG_FILE_NAME), '{');
  throwsConfigurationError([]);
});
