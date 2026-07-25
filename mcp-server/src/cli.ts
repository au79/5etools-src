import { createLogger, isPrettyLoggingEnabled } from './logger.js';
import { startStdioServer } from './server.js';

const logger = createLogger({ pretty: isPrettyLoggingEnabled() });

async function main(): Promise<void> {
  await startStdioServer({ logger });
}

void main().catch((error: unknown) => {
  logger.error({ err: error }, 'MCP server failed to start');
  process.exitCode = 1;
});
