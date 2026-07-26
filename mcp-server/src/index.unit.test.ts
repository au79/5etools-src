import assert from 'node:assert/strict';
import test from 'node:test';

import { PACKAGE_NAME } from './index.js';

void test('exports the package identity', () => {
  assert.equal(PACKAGE_NAME, '5etools-mcp-server');
});
