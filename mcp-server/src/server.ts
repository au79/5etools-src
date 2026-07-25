import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Logger } from 'pino';

import { createLogger } from './logger.js';
import { getServerMetadata, type ServerMetadata } from './serverMetadata.js';

export const SERVER_METADATA_TOOL = 'server_metadata';

export interface StartStdioServerOptions {
  readonly logger?: Logger;
}

export interface CloseableTransport {
  onclose?: () => void;
}

export interface EndAwareInput {
  once(event: 'end', listener: () => void): unknown;
}

export function resolveServerLogger(options: StartStdioServerOptions): Logger {
  return options.logger ?? createLogger();
}

export function addShutdownLogging(
  transport: CloseableTransport,
  logger: Pick<Logger, 'info'>,
  input: EndAwareInput,
): void {
  let hasLoggedShutdown = false;
  const logShutdown = () => {
    if (hasLoggedShutdown) return;

    hasLoggedShutdown = true;
    logger.info('Shutting down MCP server');
  };
  const onclose = transport.onclose;
  transport.onclose = () => {
    logShutdown();
    onclose?.();
  };
  input.once('end', logShutdown);
}

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

export async function startStdioServer(options: StartStdioServerOptions = {}): Promise<void> {
  const identity = getServerMetadata();
  const logger = resolveServerLogger(options);
  const server = createMcpServer(identity);
  const transport = new StdioServerTransport();

  logger.info(
    { commit: identity.gitCommit, dirty: identity.gitDirty, version: identity.version },
    'Starting MCP server',
  );
  await server.connect(transport);
  addShutdownLogging(transport, logger, process.stdin);
}
