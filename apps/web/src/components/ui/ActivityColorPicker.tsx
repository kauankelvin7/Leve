import { activityColors } from '../../../../../packages/domain/src/activityColors';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
export function ActivityColorPicker({ value }: { value?: string | null }) {
  const [color, setColor] = useState(value ?? '');
  return <ColorPicker label="Cor da atividade" name="colorHex" value={color} onChange={setColor} options={[{ value: '', label: 'Usar categoria' }, ...activityColors.map(option => ({ value: option.hex, label: option.name, color: option.hex }))]} />;
}
