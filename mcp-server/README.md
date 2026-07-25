# 5etools MCP Server

This is an independent package for exposing the enclosing 5etools data repository through MCP.

The package is intentionally separate from the upstream site. It has its own manifest, lockfile, source, tests, and
documentation. The MCP SDK, schema validator, and logging library will be selected in Phase 1 task P1-02.

## Current status

P1-01 establishes the package boundary only. The current entry point is a placeholder; MCP transport and data access are
not implemented yet.

## Development

From this directory:

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm run build
npm test
npm start
```

The placeholder entry point writes only a status message to stderr. Future `stdio` protocol traffic must remain on
stdout.
