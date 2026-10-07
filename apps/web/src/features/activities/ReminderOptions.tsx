import { useState } from 'react';
import type { ActivityInput } from '../../../../../packages/domain/src/content';

const presets = [{ value: 5, label: '5 minutos antes' }, { value: 10, label: '10 minutos antes' }, { value: 15, label: '15 minutos antes' }, { value: 30, label: '30 minutos antes' }, { value: 60, label: '1 hora antes' }, { value: 120, label: '2 horas antes' }, { value: 1440, label: '1 dia antes' }, { value: 2880, label: '2 dias antes' }, { value: 10080, label: '1 semana antes' }];
const units = [{ value: 1, label: 'minutos', maximum: 43200 }, { value: 60, label: 'horas', maximum: 720 }, { value: 1440, label: 'dias', maximum: 30 }, { value: 10080, label: 'semanas', maximum: 4 }];
type Entry = { id: string; choice: string; amount: number; unit: number };

export function ReminderOptions({ initial = [] }: { initial?: ActivityInput['reminderSpecs'] }) {
  const [entries, setEntries] = useState<Entry[]>(() => initial.filter(spec => spec.minutesBefore > 0).map(spec => ({ id: spec.id, choice: presets.some(preset => preset.value === spec.minutesBefore) ? String(spec.minutesBefore) : 'custom', amount: spec.minutesBefore, unit: 1 })));
  const update = (id: string, patch: Partial<Entry>) => setEntries(values => values.map(value => value.id === id ? { ...value, ...patch } : value));
  const minutes = (entry: Entry) => entry.choice === 'custom' ? entry.amount * entry.unit : Number(entry.choice);
  const duplicate = entries.some((entry, index) => entries.slice(0, index).some(other => minutes(other) === minutes(entry)));
  return <div>
    <p className="field-hint">O aviso automático já está incluído. Se quiser, adicione até três avisos antes dele.</p>
    {entries.map((entry, index) => <div key={entry.id} className="reminder-option">
      <input type="hidden" name="reminders" value={minutes(entry)} />
      <div className="date-fields"><label>Aviso antecipado {index + 1}<select value={entry.choice} onChange={event => update(entry.id, { choice: event.target.value })}>{presets.map(preset => <option key={preset.value} value={preset.value}>{preset.label}</option>)}<option value="custom">Personalizar…</option></select></label><button type="button" aria-label={`Remover aviso ${index + 1}`} onClick={() => setEntries(values => values.filter(value => value.id !== entry.id))}>Remover</button></div>
      {entry.choice === 'custom' && <div className="date-fields"><label>Antecedência {index + 1}<input type="number" min="1" max={units.find(unit => unit.value === entry.unit)!.maximum} required value={entry.amount} onChange={event => update(entry.id, { amount: Number(event.target.value) })} /></label><label>Unidade do aviso {index + 1}<select value={entry.unit} onChange={event => update(entry.id, { unit: Number(event.target.value), amount: 1 })}>{units.map(unit => <option value={unit.value} key={unit.value}>{unit.label}</option>)}</select></label></div>}
    </div>)}
    {duplicate && <p role="alert">Escolha antecedências diferentes para cada aviso.</p>}
    {entries.length < 3 && <button type="button" onClick={() => setEntries(values => [...values, { id: crypto.randomUUID(), choice: String(presets.find(preset => !values.some(value => minutes(value) === preset.value))!.value), amount: 1, unit: 1 }])}>Adicionar aviso antecipado</button>}
  </div>;
}
