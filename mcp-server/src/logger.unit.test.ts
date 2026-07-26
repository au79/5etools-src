import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { describe, test } from 'node:test';

import { createLogger, getConfigurationLogFields, type LogFields, observeAction } from './logger.js';

void describe('Logger', () => {
  void test('writes JSON logs to the configured stderr sink', async () => {
    const stderr = new PassThrough();
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    let stdoutWrites = 0;
    process.stdout.write = () => {
      stdoutWrites += 1;
      return true;
    };

    try {
      const output = new Promise<Buffer>((resolve) => stderr.once('data', (chunk: Buffer) => resolve(chunk)));
      const logger = createLogger({ destination: stderr });
      logger.info({ event: 'test' }, 'logger smoke test');

      const record = JSON.parse((await output).toString('utf8')) as {
        readonly event: string;
        readonly msg: string;
      };

      assert.equal(record.event, 'test');
      assert.equal(record.msg, 'logger smoke test');
      assert.equal(stdoutWrites, 0);
    } finally {
      process.stdout.write = originalStdoutWrite;
    }
  });

  void test('creates a pretty logger when requested', () => {
    assert.doesNotThrow(() => createLogger({ pretty: true }));
  });

  void test('uses the requested log level', () => {
    assert.equal(createLogger({ level: 'error' }).level, 'error');
  });

  void test('logs safe bounded operation context without logging raw values', () => {
    const info: LogFields[] = [];
    const error: LogFields[] = [];
    const logger = {
      error: (fields: LogFields) => error.push(fields),
      info: (fields: LogFields) => info.push(fields),
    } as unknown as ReturnType<typeof createLogger>;
    const rawRecord = { name: 'Never log this record', secret: 'do-not-log' };

    const value = observeAction(logger, {
      complete: () => ({ resultCount: 1 }),
      event: 'mcp.search',
      fields: { queryLength: 12 },
      action: () => rawRecord,
    });

    assert.equal(value, rawRecord);
    assert.equal(info.length, 2);
    assert.equal(info[0]?.event, 'mcp.search.started');
    assert.equal(info[1]?.event, 'mcp.search.completed');
    assert.equal(info[1]?.resultCount, 1);
    assert.equal(typeof info[0]?.operationId, 'string');
    assert.equal(info[0]?.operationId, info[1]?.operationId);
    assert.equal(JSON.stringify(info).includes('Never log this record'), false);
    assert.equal(error.length, 0);

    observeAction(logger, { action: () => undefined, event: 'mcp.server_metadata' });
    assert.equal(info[3]?.event, 'mcp.server_metadata.completed');
  });

  void test('logs known errors safely and hides unexpected error messages', () => {
    const error: LogFields[] = [];
    const logger = { error: (fields: LogFields) => error.push(fields), info: () => undefined } as unknown as ReturnType<
      typeof createLogger
    >;
    const knownError = new Error('Query must be at most 200 characters.');
    knownError.name = 'QueryError';

    assert.throws(
      () =>
        observeAction(logger, {
          event: 'mcp.search',
          action: () => {
            throw knownError;
          },
        }),
      knownError,
    );
    assert.throws(() =>
      observeAction(logger, {
        event: 'catalog.build',
        action: () => {
          throw new Error('secret value');
        },
      }),
    );
    assert.equal(error[0]?.event, 'mcp.search.failed');
    assert.equal(error[0]?.errorMessage, knownError.message);
    assert.equal(error[1]?.event, 'catalog.build.failed');
    assert.equal(error[1]?.errorMessage, 'Unexpected internal failure.');
    assert.equal(JSON.stringify(error).includes('secret value'), false);
  });

  void test('redacts filesystem paths from effective configuration logs', () => {
    const fields = getConfigurationLogFields({
      adventure: { mode: 'disabled', sourceIds: [] },
      configPath: '/private/config/.5etools-mcp.jsonc',
      log: { level: 'info', pretty: false },
      projectRoot: '/private/project',
      sourceRoots: [{ name: 'data', path: '/private/project/data' }],
      validationRollout: ['races', 'classes'],
      warnings: ['one warning'],
    });

    assert.deepEqual(fields, {
      adventureMode: 'disabled',
      configFileConfigured: true,
      logLevel: 'info',
      logPretty: false,
      sourceRoots: ['data'],
      validationRollout: ['races', 'classes'],
      warningCount: 1,
    });
    assert.equal(JSON.stringify(fields).includes('/private'), false);
    assert.equal(
      getConfigurationLogFields({
        adventure: { mode: 'disabled', sourceIds: [] },
        log: { level: 'info', pretty: false },
        projectRoot: '/private/project',
        sourceRoots: [{ name: 'data', path: '/private/project/data' }],
        validationRollout: ['races'],
        warnings: [],
      }).configFileConfigured,
      false,
    );
  });
});
