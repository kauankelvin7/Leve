import { describe, expect, it } from 'vitest';
import { hashCanonicalValue } from '../../server/hash';

describe('hash canônico', () => {
  it('não muda quando somente a ordem das chaves muda', () => {
    expect(hashCanonicalValue({ profile: { name: 'Leve', locale: 'pt-BR' }, version: 1 }))
      .toBe(hashCanonicalValue({ version: 1, profile: { locale: 'pt-BR', name: 'Leve' } }));
  });
});
