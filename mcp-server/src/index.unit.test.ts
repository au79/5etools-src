import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PACKAGE_NAME } from './index.js';

void describe('Package identity', () => {
  void test('exports the package identity', () => {
    assert.equal(PACKAGE_NAME, '5etools-mcp-server');
  });
});
