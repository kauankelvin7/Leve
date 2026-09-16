import { noteColorPresets, notePresetIds } from '../../../../packages/domain/src/notePresets';

const STYLE_ID = 'leve-note-preset-styles';

function paletteDeclarations(palette: { surface: string; surfaceHover: string; border: string; accent: string }) {
  return `
    --note-surface: ${palette.surface};
    --note-surface-hover: ${palette.surfaceHover};
    --note-border: ${palette.border};
    --note-accent: ${palette.accent};`;
}

/**
 * Installs note preset CSS from the shared registry after the static style layers.
 * This keeps every note surface (Notes, Meu dia and demo) on the same palette
 * without duplicating color literals throughout CSS and components.
 */
export function installNotePresetStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const rules = notePresetIds.flatMap(id => {
    const preset = noteColorPresets[id];
    return [
      `:root .app-shell .note.${id} {${paletteDeclarations(preset.light)}
        color: var(--color-text);
        background: linear-gradient(135deg, var(--note-surface), color-mix(in srgb, var(--note-surface) 88%, var(--note-accent)));
        border-color: color-mix(in srgb, var(--note-border) 72%, var(--editorial-line));
      }`,
      `:root .app-shell .note.${id}:hover {
        background: linear-gradient(135deg, var(--note-surface-hover), color-mix(in srgb, var(--note-surface-hover) 86%, var(--note-accent)));
      }`,
      `:root .app-shell .note-grid .note.${id} { border-left-color: var(--note-accent); }`,
      `:root .app-shell .note-composer[data-note-preset='${id}'] {${paletteDeclarations(preset.light)} }`,
      `:root[data-appearance='dark'] .app-shell .note.${id} {${paletteDeclarations(preset.dark)}
        color: var(--color-text);
        background: linear-gradient(135deg, var(--note-surface), color-mix(in srgb, var(--note-surface) 88%, var(--note-accent)));
        border-color: color-mix(in srgb, var(--note-border) 78%, var(--editorial-line));
      }`,
      `:root[data-appearance='dark'] .app-shell .note.${id}:hover {
        background: linear-gradient(135deg, var(--note-surface-hover), color-mix(in srgb, var(--note-surface-hover) 86%, var(--note-accent)));
      }`,
      `:root[data-appearance='dark'] .app-shell .note-grid .note.${id} { border-left-color: var(--note-accent); }`,
      `:root[data-appearance='dark'] .app-shell .note-composer[data-note-preset='${id}'] {${paletteDeclarations(preset.dark)} }`,
    ];
  });

  rules.push(`
    :root .app-shell .note-composer[data-note-preset] {
      background: color-mix(in srgb, var(--note-surface) 58%, var(--color-solid));
      border-color: color-mix(in srgb, var(--note-border) 58%, var(--editorial-line));
      transition: background-color 160ms ease, border-color 160ms ease;
    }
    :root .app-shell .note-composer[data-note-preset] .rich-editor {
      border-color: color-mix(in srgb, var(--note-border) 64%, var(--color-border));
    }
    :root .app-shell .note-composer[data-note-preset] .editor-toolbar {
      background: color-mix(in srgb, var(--note-surface) 58%, var(--color-solid));
      border-color: color-mix(in srgb, var(--note-border) 58%, var(--color-border));
    }
    :root .app-shell .note-composer[data-note-preset] .editor-surface {
      background: color-mix(in srgb, var(--note-surface) 78%, var(--color-solid));
      color: var(--color-text);
    }
    :root[data-appearance='dark'] .app-shell .note-composer[data-note-preset] {
      background: color-mix(in srgb, var(--note-surface) 72%, var(--color-solid));
      border-color: color-mix(in srgb, var(--note-border) 70%, var(--editorial-line));
    }
    :root[data-appearance='dark'] .app-shell .note-composer[data-note-preset] .editor-toolbar {
      background: color-mix(in srgb, var(--note-surface) 64%, var(--color-solid));
    }
    :root[data-appearance='dark'] .app-shell .note-composer[data-note-preset] .editor-surface {
      background: color-mix(in srgb, var(--note-surface) 88%, var(--color-solid));
    }
    @media (prefers-reduced-motion: reduce) {
      :root .app-shell .note-composer[data-note-preset] { transition: none; }
    }
  `);

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = rules.join('\n');
  document.head.append(style);
}
