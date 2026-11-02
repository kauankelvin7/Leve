import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Firestore does not auto-create collection-group indexes for filtered queries.
// A missing index causes the signed scheduler tick to fail every minute.
const manifest = JSON.parse(readFileSync(new URL('../../firestore.indexes.json', import.meta.url), 'utf8'));

describe('scheduler Firestore index contract', () => {
  it('covers every collection group scanned by purgeExpiredContent', () => {
    const purgeGroups = ['activities', 'categories', 'notes', 'shoppingLists', 'items', 'series'];
    for (const collectionGroup of purgeGroups) {
      const override = manifest.fieldOverrides.find(
        (entry: { collectionGroup: string; fieldPath: string }) =>
          entry.collectionGroup === collectionGroup && entry.fieldPath === 'purgeAfter',
      );
      expect(override?.indexes, `Missing purgeAfter index for ${collectionGroup}`).toContainEqual({
        order: 'ASCENDING',
        queryScope: 'COLLECTION_GROUP',
      });
    }
  });

  it('covers the filtered recurrence materialization query', () => {
    expect(manifest.indexes).toContainEqual({
      collectionGroup: 'series',
      queryScope: 'COLLECTION_GROUP',
      fields: [
        { fieldPath: 'state', order: 'ASCENDING' },
        { fieldPath: 'materializedThrough', order: 'ASCENDING' },
      ],
    });
  });
});
