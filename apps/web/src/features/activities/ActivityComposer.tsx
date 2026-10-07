import { RecurrenceOptions } from './RecurrenceOptions';
import { ReminderOptions } from './ReminderOptions';
import type { FormEventHandler, RefObject } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { type Category } from '../../../../../packages/domain/src/content';
import { ActivityColorPicker } from '../../components/ui/ActivityColorPicker';
import type { StoredActivity } from './TodayActivityRow';
import type { PlannerDraft } from './calendar/calendarDraftModel';

type ActivityComposerProps = {
  composer: RefObject<HTMLElement | null>;
  editing: StoredActivity | null;
  kind: 'task' | 'event';
  setKind: (value: 'task' | 'event') => void;
  eventAllDay: boolean;
  setEventAllDay: (value: boolean) => void;
  recurrenceFrequency: string;
  setRecurrenceFrequency: (value: string) => void;
  editScope: 'occurrence' | 'future';
  setEditScope: (value: 'occurrence' | 'future') => void;
  selectedDay: string;
  plannerDraft: PlannerDraft | null;
  activeCategories: Category[];
  busy: boolean;
  message: string;
  messageTone: 'success' | 'error' | 'info';
  onSave: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  clearPending: () => void;
};

export function ActivityComposer({
  composer, editing, kind, setKind, eventAllDay, setEventAllDay,
  recurrenceFrequency, setRecurrenceFrequency, editScope, setEditScope,
  selectedDay, plannerDraft, activeCategories, busy, message, messageTone,
  onSave, onClose, clearPending,
}: ActivityComposerProps) {
  const editingEvent = editing?.schedule.type === 'event' && !editing.schedule.allDay ? editing.schedule : null;
  return (
            <section ref={composer} className="panel activity-composer" aria-labelledby="new-activity">
              <h2 id="new-activity">{editing ? 'Editar atividade' : 'Nova atividade'}</h2>
              <form key={editing?.id ?? (plannerDraft ? `${plannerDraft.startDate}:${plannerDraft.startTime}:${plannerDraft.endDate}:${plannerDraft.endTime}` : 'new')} onSubmit={onSave}>
                {/* Kind */}
                <label>
                  Tipo
                  <select
                    value={kind}
                    onChange={e => { setKind(e.target.value as 'task' | 'event'); setEventAllDay(false); clearPending(); }}
                  >
                    <option value="task">Tarefa</option>
                    <option value="event">Compromisso</option>
                  </select>
                </label>

                {/* Title */}
                <label>
                  Título
                  <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={editing?.title ?? ''}
                    placeholder={kind === 'task' ? 'Ex.: estudar capítulo 3' : 'Ex.: consulta médica'}
                    onChange={() => { clearPending(); }}
                    autoFocus
                  />
                </label>

                {/* All-day toggle for events */}
                {kind === 'event' && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={e => setEventAllDay(e.target.checked)}
                    />
                    Compromisso de dia inteiro
                  </label>
                )}

                {/* Core schedule */}
                {kind === 'task' ? (
                  <div className="task-schedule-block">
                    <label>
                      Data
                      <input
                        name="dueDate"
                        type="date"
                        defaultValue={
                          editing?.schedule.type === 'task'
                            ? editing.schedule.dueDate ?? selectedDay
                            : selectedDay
                        }
                      />
                    </label>
                    <details
                      className="task-time-details"
                      open={Boolean(editing?.schedule.type === 'task' && editing.schedule.dueTime)}
                    >
                      <summary>Adicionar horário <span>opcional</span></summary>
                      <label>
                        Horário
                        <input
                          name="dueTime"
                          type="time"
                          defaultValue={editing?.schedule.type === 'task' ? editing.schedule.dueTime ?? '' : ''}
                        />
                      </label>
                    </details>
                  </div>
                ) : (
                  <div className="date-fields">
                    <label>
                      Início
                      <input
                        name="dueDate"
                        type="date"
                        required
                        defaultValue={
                          editing?.schedule.type === 'event'
                            ? editing.schedule.startDate
                            : plannerDraft?.startDate ?? selectedDay
                        }
                      />
                    </label>
                    {!eventAllDay && (
                      <label>
                        Horário inicial
                        <input
                          name="dueTime"
                          type="time"
                          required
                          defaultValue={editingEvent?.startTime ?? plannerDraft?.startTime ?? ''}
                        />
                      </label>
                    )}
                  </div>
                )}

                {kind === 'event' && eventAllDay ? (
                  <label>
                    Último dia
                    <input
                      name="allDayEndDate"
                      type="date"
                      required
                      defaultValue={
                        editing?.schedule.type === 'event' && editing.schedule.allDay
                          ? Temporal.PlainDate.from(editing.schedule.endDateExclusive).subtract({ days: 1 }).toString()
                          : plannerDraft?.startDate ?? selectedDay
                      }
                    />
                  </label>
                ) : kind === 'event' ? (
                  <div className="date-fields">
                    <label>
                      Fim
                      <input name="endDate" type="date" required defaultValue={editingEvent?.endDate ?? plannerDraft?.endDate ?? ''} />
                    </label>
                    <label>
                      Horário final
                      <input name="endTime" type="time" required defaultValue={editingEvent?.endTime ?? plannerDraft?.endTime ?? ''} />
                    </label>
                  </div>
                ) : null}

                <details className="optional-fields" open={Boolean(editing)}>
                  <summary>Mais opções <span>opcional</span></summary>
                  <div className="optional-fields-content">
                    <label>
                      Categoria
                      <select name="categoryId" defaultValue={editing?.categoryId ?? ''}>
                        <option value="">Sem categoria</option>
                        {activeCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </label>

                    <ActivityColorPicker value={editing?.colorHex} />

                    <label>
                      Tempo estimado <small>(minutos)</small>
                      <input name="estimatedMinutes" type="number" min="5" max="1440" step="5" defaultValue={editing?.estimatedMinutes ?? ''} placeholder="Ex.: 45" />
                    </label>

                    <label>
                      Descrição <small>(opcional)</small>
                      <textarea
                        name="description"
                        maxLength={5000}
                        rows={3}
                        placeholder="Contexto, observações ou detalhes úteis"
                        defaultValue={editing?.descriptionPlain ?? ''}
                      />
                    </label>

                    <fieldset>
                      <legend>Notificações</legend>
                      {kind === 'task'
                        ? <p className="field-hint">Com as notificações ativadas, você recebe um aviso no horário da tarefa. Se ela tiver só uma data, o aviso chega pela manhã no dia da atividade.</p>
                        : eventAllDay
                          ? <p className="field-hint">Você recebe um aviso pela manhã no primeiro dia, com as notificações ativadas neste aparelho. O compromisso continua sendo de dia inteiro.</p>
                          : <p className="field-hint">Com as notificações ativadas neste aparelho, você recebe um aviso no horário do compromisso. Se quiser, escolha lembretes antecipados:</p>}
                      <ReminderOptions initial={editing?.reminderSpecs} />
                    </fieldset>

                    {!editing && <RecurrenceOptions frequency={recurrenceFrequency} onChange={setRecurrenceFrequency} selectedDay={selectedDay} />}
                  </div>
                </details>

                {editing?.seriesId ? (
                  <fieldset>
                    <legend>Aplicar alteração</legend>
                    <label className="check-label">
                      <input
                        type="radio"
                        name="editScope"
                        checked={editScope === 'occurrence'}
                        onChange={() => setEditScope('occurrence')}
                      />
                      Somente esta ocorrência
                    </label>
                    <label className="check-label">
                      <input
                        type="radio"
                        name="editScope"
                        checked={editScope === 'future'}
                        onChange={() => setEditScope('future')}
                      />
                      Esta e as futuras
                    </label>
                  </fieldset>
                ) : null}

                <div className="dialog-actions">
                  <button className="primary" disabled={busy}>
                    {busy ? 'Salvando…' : editing ? 'Atualizar atividade' : 'Adicionar atividade'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                </div>
                {message ? <p role={messageTone === 'error' ? 'alert' : 'status'} className={`form-status activity-form-status ${messageTone}`} aria-live="polite">{message}</p> : null}
              </form>
            </section>
  );
}
