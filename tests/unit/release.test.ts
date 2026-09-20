import { describe, expect, it } from 'vitest';
import { entryModulePath, hasNewEntryBundle } from '../../apps/web/src/platform/release';

describe('detecção de release do frontend', () => {
  it('extrai o bundle principal mesmo com atributos em outra ordem', () => {
    const html = '<!doctype html><script crossorigin src="/assets/index-abc123.js" type="module"></script>';
    expect(entryModulePath(html, 'https://leve.example')).toBe('/assets/index-abc123.js');
  });

  it('detecta quando o deploy aponta para outro bundle', () => {
    const html = '<script type="module" crossorigin src="/assets/index-new456.js"></script>';
    expect(hasNewEntryBundle(
      'https://leve.example/assets/index-old123.js',
      html,
      'https://leve.example',
    )).toBe(true);
  });

  it('não solicita atualização quando o bundle continua o mesmo', () => {
    const html = '<script type="module" src="/assets/index-same123.js"></script>';
    expect(hasNewEntryBundle(
      'https://leve.example/assets/index-same123.js',
      html,
      'https://leve.example',
    )).toBe(false);
  });
});
