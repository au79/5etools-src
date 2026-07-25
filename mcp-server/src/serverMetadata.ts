import { readFileSync } from 'node:fs';

import { z } from 'zod';

export const ServerMetadataSchema = z.strictObject({
  description: z.string().min(1),
  gitCommit: z.string().regex(/^[0-9a-f]{40}$/),
  gitDirty: z.boolean(),
  name: z.string().min(1),
  version: z.string().min(1),
});

export type ServerMetadata = z.infer<typeof ServerMetadataSchema>;

const SERVER_METADATA_PATH = new URL('../server-metadata.json', import.meta.url);
let cachedServerMetadata: ServerMetadata | undefined;

function readServerMetadata(): ServerMetadata {
  return parseServerMetadata(JSON.parse(readFileSync(SERVER_METADATA_PATH, 'utf8')) as unknown);
}

export function parseServerMetadata(value: unknown): ServerMetadata {
  return ServerMetadataSchema.parse(value);
}

export function getServerMetadata(): ServerMetadata {
  return (cachedServerMetadata ??= readServerMetadata());
}
