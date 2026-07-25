import assert from 'node:assert/strict';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createMcpServer, SERVER_METADATA_TOOL } from '../src/server.js';
import type { ServerMetadata } from '../src/serverMetadata.js';

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
