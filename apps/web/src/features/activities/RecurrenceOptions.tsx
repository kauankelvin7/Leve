import { useState } from 'react';
import { OptionPicker } from '../../components/ui/OptionPicker';

const units = [{ value: 'daily', label: 'dias' }, { value: 'weekly', label: 'semanas' }, { value: 'monthly', label: 'meses' }, { value: 'yearly', label: 'anos' }];

export function RecurrenceOptions({ frequency, onChange, selectedDay }: { frequency: string; onChange: (value: string) => void; selectedDay: string }) {
  const [unit, setUnit] = useState('weekly');
  const [ending, setEnding] = useState('never');
  const effective = frequency === 'custom' ? unit : frequency;
  return <fieldset><legend>Repetição</legend>
    <OptionPicker label="Repetir atividade" name="recurrenceChoice" value={frequency} onChange={onChange} options={[
      { value: 'none', label: 'Não se repete' }, { value: 'daily', label: 'Todos os dias' },
      { value: 'weekly', label: 'Todas as semanas' }, { value: 'monthly', label: 'Todos os meses' },
      { value: 'yearly', label: 'Todos os anos' }, { value: 'custom', label: 'Personalizar…' },
    ]} />
    {frequency !== 'none' && <>
      {frequency === 'custom' ? <div className="date-fields">
        <label>Repetir a cada<input name="recurrenceInterval" type="number" required min="1" max="30" defaultValue="1" /></label>
        <label>Unidade da repetição<select name="recurrenceUnit" value={unit} onChange={event => setUnit(event.target.value)}>{units.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div> : <input type="hidden" name="recurrenceInterval" value="1" />}
      <label>Termina<select value={ending} onChange={event => setEnding(event.target.value)}><option value="never">Sem data final</option><option value="date">Em uma data</option><option value="count">Após uma quantidade</option></select></label>
      {ending === 'date' && <label>Data final<input name="recurrenceUntil" type="date" min={selectedDay} required /></label>}
      {ending === 'count' && <label>Quantidade de ocorrências<input name="recurrenceCount" type="number" min="2" max="180" required defaultValue="10" /><small className="field-hint">Inclui a primeira atividade.</small></label>}
      {(effective === 'monthly' || effective === 'yearly') && <label>Quando o dia não existir<select name="monthlyPolicy" defaultValue="lastDay"><option value="lastDay">Usar o último dia do mês</option><option value="skip">Pular essa ocorrência</option></select></label>}
      <small className="field-hint">As próximas atividades aparecem conforme a data se aproxima, com os mesmos avisos. Até 180 ocorrências por criação.</small>
    </>}
  </fieldset>;
}
