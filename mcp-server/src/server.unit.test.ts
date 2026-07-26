import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import type { PhaseOneCatalog } from './catalog.js';
import { createPhaseOneCatalog } from './catalog.js';
import { createLogger } from './logger.js';
import { QueryError } from './query.js';
import {
  addShutdownLogging,
  createMcpServer,
  getToolErrorResponse,
  resolveServerCatalog,
  resolveServerLogger,
  SEARCH_TOOL,
  SERVER_METADATA_TOOL,
} from './server.js';
import type { ServerMetadata } from './serverMetadata.js';

const identity: ServerMetadata = {
  description: 'Test MCP server',
  gitCommit: '0123456789abcdef0123456789abcdef01234567',
  gitDirty: false,
  name: 'test-server',
  version: '0.1.0',
};

void describe('MCP server', () => {
  void test('creates a server that advertises identity and serves metadata', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer(identity);
    const client = new Client({ name: 'server-unit-test-client', version: '0.1.0' }, { capabilities: {} });

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      assert.deepEqual(client.getServerVersion(), {
        description: identity.description,
        name: identity.name,
        version: identity.version,
      });
      assert.deepEqual(
        (await client.listTools()).tools.map((tool) => tool.name),
        [SERVER_METADATA_TOOL],
      );

      const result = await client.callTool({ name: SERVER_METADATA_TOOL, arguments: {} });
      assert.equal(result.isError, undefined);
      assert.deepEqual(result.content, [{ type: 'text', text: JSON.stringify(identity) }]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  void test('preserves an injected logger', () => {
    const logger = createLogger({ destination: new PassThrough() });

    assert.equal(resolveServerLogger({ logger }), logger);
    assert.doesNotThrow(() => resolveServerLogger({}));
  });

  void test('uses an injected catalog or resolves the selected project root', () => {
    const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const catalog = createPhaseOneCatalog(projectRoot);

    assert.equal(resolveServerCatalog({ catalog }), catalog);
    assert.ok(resolveServerCatalog({ projectRoot }).records.length > 2_000);
  });

  void test('returns safe query and unexpected tool errors', () => {
    const queryError = new QueryError('Exact retrieval is ambiguous.');

    assert.deepEqual(JSON.parse(getToolErrorResponse(queryError).content[0]!.text), {
      candidates: [],
      error: queryError.message,
    });
    assert.deepEqual(JSON.parse(getToolErrorResponse(new Error('secret')).content[0]!.text), {
      error: 'The operation failed.',
    });
  });

  void test('returns a safe response when search encounters an unexpected failure', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const cyclicRecord: Record<string, unknown> = { name: 'Cyclic', source: 'TST' };
    cyclicRecord.self = cyclicRecord;
    const catalog = {
      records: [
        {
          data: cyclicRecord,
          domain: 'race',
          file: 'data/races.json',
          id: 'race/cyclic/tst',
          source: 'TST',
          sourceRoot: 'data',
        },
      ],
    } as unknown as PhaseOneCatalog;
    const logger = { error: () => undefined, info: () => undefined } as unknown as ReturnType<typeof createLogger>;
    const server = createMcpServer(identity, catalog, logger);
    const client = new Client({ name: 'server-unit-test-client', version: '0.1.0' }, { capabilities: {} });

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      const result = await client.callTool({ arguments: { query: 'miss' }, name: SEARCH_TOOL });
      const content = (result.content as readonly { readonly text?: unknown; readonly type?: unknown }[])[0];

      assert.equal(result.isError, true);
      assert.equal(content?.type, 'text');
      if (content?.type === 'text' && typeof content.text === 'string') {
        assert.deepEqual(JSON.parse(content.text), { error: 'The operation failed.' });
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  void test('logs shutdown without replacing the transport close handler', () => {
    const messages: unknown[] = [];
    const logger = {
      info: (fields: unknown, message: string) => messages.push({ fields, message }),
    } as unknown as ReturnType<typeof createLogger>;
    let originalHandlerCalls = 0;
    const transport = {
      onclose: () => {
        originalHandlerCalls += 1;
      },
    };
    let endHandler: (() => void) | undefined;
    const input = {
      once: (event: string | symbol, handler: () => void) => {
        assert.equal(event, 'end');
        endHandler = handler;
      },
    };

    addShutdownLogging(transport, logger, input);
    transport.onclose?.();
    endHandler?.();

    assert.deepEqual(messages, [{ fields: { event: 'server.stopped' }, message: 'MCP server stopped' }]);
    assert.equal(originalHandlerCalls, 1);
  });

  void test('logs shutdown when the transport has no close handler', () => {
    const messages: unknown[] = [];
    const logger = {
      info: (fields: unknown, message: string) => messages.push({ fields, message }),
    } as unknown as ReturnType<typeof createLogger>;
    const transport: { onclose?: () => void } = {};
    const input = { once: () => undefined };

    addShutdownLogging(transport, logger, input);
    transport.onclose?.();

    assert.deepEqual(messages, [{ fields: { event: 'server.stopped' }, message: 'MCP server stopped' }]);
  });
});
