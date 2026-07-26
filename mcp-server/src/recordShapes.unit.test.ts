import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { type Entry, walkEntries } from './recordShapes.js';

void describe('Shared record shapes', () => {
  void test('walks nested entry text without rendering or altering tags', () => {
    const entries: readonly Entry[] = [
      'A {@damage 1d6} tagged string.',
      {
        entries: [
          'Nested {@condition frightened} text.',
          { items: ['Deeply nested {@spell shield} text.'], type: 'list' },
        ],
        name: 'Trait',
        type: 'entries',
      },
      { type: 'refSubclassFeature' },
    ];
    const text: string[] = [];

    walkEntries(entries, (entry) => text.push(entry));

    assert.deepEqual(text, [
      'A {@damage 1d6} tagged string.',
      'Nested {@condition frightened} text.',
      'Deeply nested {@spell shield} text.',
    ]);
  });
});
