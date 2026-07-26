import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { z } from 'zod';

import { getServerMetadata, parseServerMetadata } from './serverMetadata.js';

const validMetadata = {
  description: 'Test MCP server',
  gitCommit: '0123456789abcdef0123456789abcdef01234567',
  gitDirty: false,
  name: 'test-server',
  version: '0.1.0',
};

void describe('Server metadata', () => {
  void test('parses valid metadata and rejects shape changes', () => {
    assert.deepEqual(parseServerMetadata(validMetadata), validMetadata);
    assert.throws(() => parseServerMetadata({ ...validMetadata, unexpected: true }), z.ZodError);
    assert.throws(() => parseServerMetadata({ ...validMetadata, gitCommit: 'not-a-commit' }), z.ZodError);
  });

  void test('loads the generated metadata file', () => {
    const metadata = getServerMetadata();

    assert.equal(typeof metadata.description, 'string');
    assert.match(metadata.gitCommit, /^[0-9a-f]{40}$/);
    assert.equal(typeof metadata.gitDirty, 'boolean');
  });
});
