import { createCatalog } from './catalog.js';
import { resolveConfiguration } from './config.js';
import { createLogger, getConfigurationLogFields, observeAction } from './logger.js';
import { startStdioServer } from './server.js';
import { validateCatalogProjectRoot } from './validation.js';

let logger = createLogger();

async function main(): Promise<void> {
  const configuration = resolveConfiguration();
  logger = createLogger({ level: configuration.log.level, pretty: configuration.log.pretty });
  logger.info(
    { event: 'server.configuration.loaded', ...getConfigurationLogFields(configuration) },
    'Loaded MCP configuration',
  );
  observeAction(logger, {
    complete: (results) => ({ fileCount: results.reduce((count, result) => count + result.files.length, 0) }),
    event: 'validation',
    fields: { sourceRoots: configuration.sourceRoots.map((sourceRoot) => sourceRoot.name) },
    action: () =>
      configuration.sourceRoots.map((sourceRoot) =>
        validateCatalogProjectRoot(configuration.projectRoot, sourceRoot.name),
      ),
  });
  const catalog = observeAction(logger, {
    complete: (result) => ({ recordCount: result.records.length }),
    event: 'catalog.build',
    fields: { sourceRoots: configuration.sourceRoots.map((sourceRoot) => sourceRoot.name) },
    action: () => createCatalog(configuration.projectRoot, configuration.sourceRoots, configuration.adventure),
  });
  await startStdioServer({
    catalog,
    logger,
  });
}

void main().catch((error: unknown) => {
  logger.error(
    { errorType: error instanceof Error ? error.name : 'UnknownError', event: 'server.startup.failed' },
    'MCP server failed to start',
  );
  process.exitCode = 1;
});
