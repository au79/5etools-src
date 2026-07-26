import { resolveConfiguration } from './config.js';
import { createLogger } from './logger.js';
import { startStdioServer } from './server.js';
import { validatePhaseOneProjectRoot } from './validation.js';

let logger = createLogger();

async function main(): Promise<void> {
  const configuration = resolveConfiguration();
  logger = createLogger({ level: configuration.log.level, pretty: configuration.log.pretty });
  validatePhaseOneProjectRoot(configuration.projectRoot);
  await startStdioServer({ logger });
}

void main().catch((error: unknown) => {
  logger.error({ err: error }, 'MCP server failed to start');
  process.exitCode = 1;
});
