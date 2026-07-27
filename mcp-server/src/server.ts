import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Logger } from 'pino';
import { z } from 'zod';

import { type Catalog, createCatalog } from './catalog.js';
import { createLogger, observeAction } from './logger.js';
import { getCatalogRecord, QueryError, searchCatalog } from './query.js';
import { getServerMetadata, type ServerMetadata } from './serverMetadata.js';

export const SERVER_METADATA_TOOL = 'server_metadata';
export const SEARCH_TOOL = 'search';
export const GET_TOOL = 'get';

export interface StartStdioServerOptions {
  readonly catalog?: Catalog;
  readonly logger?: Logger;
  readonly projectRoot?: string;
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

export function resolveServerCatalog(options: StartStdioServerOptions): Catalog {
  return options.catalog ?? createCatalog(options.projectRoot ?? process.cwd());
}

export function addShutdownLogging(transport: CloseableTransport, logger: Logger, input: EndAwareInput): void {
  let hasLoggedShutdown = false;
  const logShutdown = () => {
    if (hasLoggedShutdown) return;

    hasLoggedShutdown = true;
    logger.info({ event: 'server.stopped' }, 'MCP server stopped');
  };
  const onclose = transport.onclose;
  transport.onclose = () => {
    logShutdown();
    onclose?.();
  };
  input.once('end', logShutdown);
}

export function getToolErrorResponse(error: unknown): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  if (error instanceof QueryError) {
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ error: error.message, candidates: error.candidates }) }],
    };
  }
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'The operation failed.' }) }] };
}

export function createMcpServer(
  identity: ServerMetadata,
  catalog?: Catalog,
  logger: Logger = createLogger(),
): McpServer {
  const server = new McpServer({ name: identity.name, version: identity.version, description: identity.description });

  server.registerTool(
    SERVER_METADATA_TOOL,
    {
      title: 'Server Metadata',
      description:
        'Return the MCP server package name, version, description, and the full git commit hash running this process.',
    },
    () =>
      observeAction(logger, {
        complete: () => ({}),
        event: 'mcp.server_metadata',
        action: () => ({ content: [{ type: 'text', text: JSON.stringify(identity) }] }),
      }),
  );
  if (catalog !== undefined) {
    server.registerTool(
      SEARCH_TOOL,
      {
        title: 'Search 5etools data',
        description: 'Search raw tagged catalog records. Results retain source labels and file provenance.',
        inputSchema: {
          query: z.string().min(1).max(200),
          domain: z
            .enum([
              'race',
              'subrace',
              'background',
              'feat',
              'optionalfeature',
              'facility',
              'spell',
              'action',
              'condition',
              'disease',
              'status',
              'language',
              'languageScript',
              'object',
              'trap',
              'hazard',
              'deity',
              'table',
              'monster',
              'item',
              'itemGroup',
              'itemBase',
              'itemProperty',
              'itemType',
              'itemTypeAdditionalEntries',
              'itemEntry',
              'itemMastery',
              'vehicle',
              'vehicleUpgrade',
              'class',
              'subclass',
              'classFeature',
              'subclassFeature',
            ])
            .optional(),
          source: z.string().optional(),
          sourceRoot: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        },
      },
      (input) => {
        try {
          const records = observeAction(logger, {
            complete: (records) => ({
              files: [...new Set(records.map((record) => record.file))].slice(0, 10),
              resultCount: records.length,
            }),
            event: 'mcp.search',
            fields: {
              domain: input.domain,
              limit: input.limit,
              queryLength: input.query.length,
              source: input.source,
              sourceRoot: input.sourceRoot,
            },
            action: () => searchCatalog(catalog, input),
          });
          return { content: [{ type: 'text', text: JSON.stringify(records) }] };
        } catch (error) {
          return getToolErrorResponse(error);
        }
      },
    );
    server.registerTool(
      GET_TOOL,
      {
        title: 'Get 5etools record',
        description:
          'Get one raw tagged record by stable ID or exact domain/name/source. Ambiguous requests return safe candidates.',
        inputSchema: {
          id: z.string().optional(),
          abbreviation: z.string().optional(),
          domain: z
            .enum([
              'race',
              'subrace',
              'background',
              'feat',
              'optionalfeature',
              'facility',
              'spell',
              'action',
              'condition',
              'disease',
              'status',
              'language',
              'languageScript',
              'object',
              'trap',
              'hazard',
              'deity',
              'table',
              'monster',
              'item',
              'itemGroup',
              'itemBase',
              'itemProperty',
              'itemType',
              'itemTypeAdditionalEntries',
              'itemEntry',
              'itemMastery',
              'vehicle',
              'vehicleUpgrade',
              'class',
              'subclass',
              'classFeature',
              'subclassFeature',
            ])
            .optional(),
          name: z.string().optional(),
          source: z.string().optional(),
          sourceRoot: z.string().optional(),
        },
      },
      (input) => {
        try {
          const record = observeAction(logger, {
            complete: (record) => ({ file: record?.file, found: record !== undefined, recordId: record?.id }),
            event: 'mcp.get',
            fields: {
              domain: input.domain,
              hasId: input.id !== undefined,
              hasAbbreviation: input.abbreviation !== undefined,
              source: input.source,
              sourceRoot: input.sourceRoot,
            },
            action: () => getCatalogRecord(catalog, input),
          });
          return { content: [{ type: 'text', text: JSON.stringify(record ?? null) }] };
        } catch (error) {
          return getToolErrorResponse(error);
        }
      },
    );
  }

  return server;
}

export async function startStdioServer(options: StartStdioServerOptions = {}): Promise<void> {
  const identity = getServerMetadata();
  const logger = resolveServerLogger(options);
  const catalog = resolveServerCatalog(options);
  const server = createMcpServer(identity, catalog, logger);
  const transport = new StdioServerTransport();

  logger.info(
    {
      event: 'server.started',
      commit: identity.gitCommit,
      dirty: identity.gitDirty,
      recordCount: catalog.records.length,
      sourceRoots: [...new Set(catalog.records.map((record) => record.sourceRoot))],
      version: identity.version,
    },
    'MCP server started',
  );
  await server.connect(transport);
  addShutdownLogging(transport, logger, process.stdin);
}
