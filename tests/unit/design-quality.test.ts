import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  return [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(part => Number.parseInt(part, 16)) as Rgb;
}

function luminance(hex: string) {
  return rgb(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}

function contrast(left: string, right: string) {
  const [lighter = 0, darker = 0] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('qualidade visual base', () => {
  const root = resolve(import.meta.dirname, '../..');
  const tokens = JSON.parse(readFileSync(resolve(root, 'design-tokens.json'), 'utf8')) as { color: Record<string, string> };
  const css = readFileSync(resolve(root, 'apps/web/src/styles/app.css'), 'utf8');

  it('mantém texto e ações acima do contraste AA', () => {
    expect(contrast(tokens.color.text!, tokens.color.canvas!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.color['action-primary']!, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    for (const color of ['#705586', '#456B8B', '#92565F']) expect(contrast(color, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('mantém um foco de teclado visível em todos os temas', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 3px solid var(--color-focus)');
    expect(css).toContain(':root[data-theme=purple]');
    expect(css).toContain(':root[data-theme=blue]');
    expect(css).toContain(':root[data-theme=red]');
  });
});
