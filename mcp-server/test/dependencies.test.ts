import assert from 'node:assert/strict';
import test from 'node:test';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import pino from 'pino';
import pretty from 'pino-pretty';
import { z } from 'zod';

void test('loads the selected runtime dependencies', () => {
  assert.equal(typeof McpServer, 'function');
  assert.equal(typeof pino, 'function');
  assert.equal(typeof pretty, 'function');
  assert.equal(typeof z.object, 'function');
  assert.equal(typeof z.strictObject, 'function');
  assert.equal(typeof z.discriminatedUnion, 'function');
  assert.equal(typeof z.lazy, 'function');

  const record = z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('race'), name: z.string() })]);
  assert.deepEqual(record.parse({ kind: 'race', name: 'Elf' }), { kind: 'race', name: 'Elf' });

  const invalid = record.safeParse({ kind: 'race', name: 7 });
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.deepEqual(invalid.error.issues[0]?.path, ['name']);
});
