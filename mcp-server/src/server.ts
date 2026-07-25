import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createLogger } from './logger.js';
import { getServerMetadata, type ServerMetadata } from './serverMetadata.js';

export const SERVER_METADATA_TOOL = 'server_metadata';

export function createMcpServer(identity: ServerMetadata): McpServer {
  const server = new McpServer({ name: identity.name, version: identity.version, description: identity.description });

  server.registerTool(
    SERVER_METADATA_TOOL,
    {
      title: 'Server Metadata',
      description:
        'Return the MCP server package name, version, description, and the full git commit hash running this process.',
    },
    () => ({
      content: [{ type: 'text', text: JSON.stringify(identity) }],
    }),
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const identity = getServerMetadata();
  const logger = createLogger();
  const server = createMcpServer(identity);
  const transport = new StdioServerTransport();

  logger.info(
    { commit: identity.gitCommit, dirty: identity.gitDirty, version: identity.version },
    'Starting MCP server',
  );
  await server.connect(transport);
}
