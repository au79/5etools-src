import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createLogger } from './logger.js';
import { addShutdownLogging, createMcpServer, resolveServerLogger, SERVER_METADATA_TOOL } from './server.js';
import type { ServerMetadata } from './serverMetadata.js';

const identity: ServerMetadata = {
  description: 'Test MCP server',
  gitCommit: '0123456789abcdef0123456789abcdef01234567',
  gitDirty: false,
  name: 'test-server',
  version: '0.1.0',
};

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

void test('logs shutdown without replacing the transport close handler', () => {
  const messages: string[] = [];
  const logger = {
    info: (message: string) => messages.push(message),
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

  assert.deepEqual(messages, ['Shutting down MCP server']);
  assert.equal(originalHandlerCalls, 1);
});
