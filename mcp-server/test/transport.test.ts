import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { PACKAGE_NAME } from '../src/index.js';
import { SERVER_METADATA_TOOL } from '../src/server.js';
import { getServerMetadata } from '../src/serverMetadata.js';

function isTextContent(value: unknown): value is { readonly text: string; readonly type: 'text' } {
  if (typeof value !== 'object' || value === null) return false;

  const content = value as Record<string, unknown>;
  return content.type === 'text' && typeof content.text === 'string';
}

function getFirstContent(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] as unknown) : undefined;
}

void test('completes the MCP stdio integration gate', async () => {
  const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
  const identity = getServerMetadata();
  const transport = new StdioClientTransport({
    args: [cliPath],
    command: process.execPath,
    cwd: packageRoot,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'mcp-server-test-client', version: '0.1.0' }, { capabilities: {} });

  try {
    await client.connect(transport);

    assert.deepEqual(client.getServerVersion(), {
      description: identity.description,
      name: PACKAGE_NAME,
      version: identity.version,
    });
    assert.deepEqual(await client.ping(), {});

    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      [SERVER_METADATA_TOOL],
    );

    const result = await client.callTool({ arguments: {}, name: SERVER_METADATA_TOOL });
    assert.equal(result.isError, undefined);

    const firstContent = getFirstContent(result.content);
    if (!isTextContent(firstContent)) throw new Error('The version tool did not return text content');
    assert.deepEqual(JSON.parse(firstContent.text) as unknown, identity);
  } finally {
    await client.close();
  }
});
