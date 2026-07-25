import { createLogger } from './logger.js';
import { startStdioServer } from './server.js';

async function main(): Promise<void> {
  await startStdioServer();
}

void main().catch((error: unknown) => {
  createLogger().error({ err: error }, 'MCP server failed to start');
  process.exitCode = 1;
});
