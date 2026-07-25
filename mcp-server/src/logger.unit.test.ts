import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';

import { createLogger, isPrettyLoggingEnabled } from './logger.js';

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

void test('enables pretty logging only for the explicit development toggle', () => {
  assert.equal(isPrettyLoggingEnabled({ MCP_LOG_PRETTY: 'true' }), true);
  assert.equal(isPrettyLoggingEnabled({ MCP_LOG_PRETTY: '1' }), false);
  assert.equal(isPrettyLoggingEnabled({}), false);
});
