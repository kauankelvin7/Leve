import { OptionPicker } from './OptionPicker';
import type { ComponentProps } from 'react';

export function ColorPicker(props: Omit<ComponentProps<typeof OptionPicker>, 'swatches' | 'closeLabel' | 'fallbackLabel'>) {
  return <OptionPicker {...props} swatches closeLabel="Fechar cores" fallbackLabel="Cor personalizada" />;
}
