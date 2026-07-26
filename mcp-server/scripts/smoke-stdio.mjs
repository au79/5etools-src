import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../dist/src/cli.js', import.meta.url));
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const environment = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined));
environment.MCP_5ETOOLS_LOG_PRETTY = 'true';

function getTextContent(content) {
  const firstContent = Array.isArray(content) ? content[0] : undefined;
  if (firstContent?.type !== 'text' || typeof firstContent.text !== 'string') {
    throw new Error('server_metadata did not return text content');
  }

  return firstContent.text;
}

function formatSmokeReport({ ping, serverInfo, serverMetadata, tools }) {
  const workingTreeState = serverMetadata.gitDirty ? 'dirty (the running checkout has uncommitted changes)' : 'clean';

  return [
    'MCP stdio smoke test passed.',
    '',
    'Protocol checks',
    `  Ping: responded with ${JSON.stringify(ping)}`,
    `  Advertised tools: ${tools.join(', ') || '(none)'}`,
    '',
    'Server identity from MCP initialization',
    `  Name: ${serverInfo.name}`,
    `  Version: ${serverInfo.version}`,
    `  Description: ${serverInfo.description ?? '(none)'}`,
    '',
    'server_metadata tool result',
    `  Name: ${serverMetadata.name}`,
    `  Version: ${serverMetadata.version}`,
    `  Description: ${serverMetadata.description}`,
    `  Git commit: ${serverMetadata.gitCommit}`,
    `  Working tree: ${workingTreeState}`,
  ].join('\n');
}

async function main() {
  const transport = new StdioClientTransport({
    args: [cliPath],
    command: process.execPath,
    cwd: packageRoot,
    env: environment,
  });
  const client = new Client({ name: '5etools-mcp-smoke-client', version: '0.1.0' }, { capabilities: {} });
  let report;

  process.stderr.write('\n--- Server logs (stderr) ---\n');
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const metadataResult = await client.callTool({ arguments: {}, name: 'server_metadata' });

    report = formatSmokeReport({
      ping: await client.ping(),
      serverInfo: client.getServerVersion(),
      serverMetadata: JSON.parse(getTextContent(metadataResult.content)),
      tools: tools.tools.map((tool) => tool.name),
    });
  } finally {
    await client.close();
    process.stderr.write('--- End server logs ---\n');
  }

  process.stdout.write(`\n--- Smoke test result ---\n${report}\n--- End smoke test result ---\n`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
