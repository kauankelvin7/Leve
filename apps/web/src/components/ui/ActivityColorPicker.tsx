import { activityColors } from '../../../../../packages/domain/src/activityColors';
export function ActivityColorPicker({ value }: { value?: string | null }) {
  return <fieldset className="activity-colors"><legend>Cor da atividade</legend><label><input type="radio" name="colorHex" value="" defaultChecked={!value} />Usar categoria</label><div className="color-options">{activityColors.map(color => <label key={color.hex} style={{ backgroundColor: `${color.hex}35` }}><input type="radio" name="colorHex" value={color.hex} defaultChecked={value === color.hex} /><span className="color-dot" style={{ backgroundColor: color.hex }} />{color.name}</label>)}</div></fieldset>;
}
