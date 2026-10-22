import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPIRED_CONTENT_COLLECTION_GROUPS } from '../../server/maintenance-indexes';

const indexes = JSON.parse(readFileSync(new URL('../../firestore.indexes.json', import.meta.url), 'utf8')) as {
  fieldOverrides: Array<{
    collectionGroup: string;
    fieldPath: string;
    indexes: Array<{ order?: string; queryScope: string }>;
  }>;
};

describe('Firestore maintenance indexes', () => {
  it.each(EXPIRED_CONTENT_COLLECTION_GROUPS)('has a collection group purgeAfter index for %s', collectionGroup => {
    const override = indexes.fieldOverrides.find(index => index.collectionGroup === collectionGroup && index.fieldPath === 'purgeAfter');
    expect(override?.indexes).toContainEqual({ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' });
  });
});
