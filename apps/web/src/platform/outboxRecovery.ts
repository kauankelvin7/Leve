import type { CommandEnvelope } from '../../../../packages/domain/src/identity';

const fields: Record<string, string> = {
  title: 'Título', name: 'Nome', descriptionPlain: 'Descrição', detail: 'Observação', displayName: 'Seu nome',
  quantityValue: 'Quantidade', unit: 'Unidade', unitLabel: 'Outra unidade', listId: 'Lista', templateId: 'Modelo', cycleKey: 'Mês',
  categoryId: 'Categoria', linkedDate: 'Data vinculada', linkedActivityIds: 'Atividades vinculadas', pinned: 'Fixada',
  status: 'Situação', checked: 'Marcado', estimatedMinutes: 'Minutos previstos', activityId: 'Atividade', civilDate: 'Data', durationSeconds: 'Tempo em segundos',
  dueDate: 'Data', dueTime: 'Horário', startDate: 'Início', endDate: 'Fim', startTime: 'Horário inicial', endTime: 'Horário final', timeZone: 'Fuso',
  frequency: 'Repetição', interval: 'Intervalo', until: 'Até', count: 'Quantidade de ocorrências', byWeekday: 'Dias da semana',
  locale: 'Idioma', weekStartsOn: 'Início da semana', paperColorPreset: 'Papel', colorHex: 'Cor', listKind: 'Tipo de lista',
};
const commandLabels: Record<string, string> = {
  'activity.create': 'Criar atividade', 'activity.update': 'Editar atividade', 'activity.setStatus': 'Atualizar situação da atividade',
  'activity.trash': 'Mover atividade para a lixeira', 'activity.restore': 'Restaurar atividade', 'activity.createSeries': 'Criar repetição',
  'activity.updateSeries': 'Editar repetição', 'note.create': 'Criar nota', 'note.update': 'Editar nota', 'note.trash': 'Mover nota para a lixeira',
  'note.restore': 'Restaurar nota', 'shoppingList.create': 'Criar lista', 'shoppingList.update': 'Editar lista', 'shoppingList.trash': 'Mover lista para a lixeira',
  'shoppingList.restore': 'Restaurar lista', 'profile.update': 'Atualizar perfil', 'account.import': 'Importar dados',
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function noteText(value: unknown, depth = 0): string {
  if (depth > 12) return '';
  const node = record(value);
  if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
  if (node.type === 'hardBreak') return '\n';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(child => noteText(child, depth + 1)).join(node.type === 'paragraph' ? '' : '\n');
}

/** Recover user content only. Never serialize transport metadata, signatures,
 * notification credentials, arbitrary unknown fields or HTML. */
export function outboxRecoveryText(command: CommandEnvelope): string {
  const lines = [commandLabels[command.command] ?? 'Alteração guardada'];
  const append = (value: unknown) => {
    const payload = record(value);
    for (const [key, label] of Object.entries(fields)) {
      const content = payload[key];
      if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') lines.push(`${label}: ${content}`);
      else if (Array.isArray(content) && content.every(item => typeof item === 'string' || typeof item === 'number')) lines.push(`${label}: ${content.join(', ')}`);
    }
    if (payload.bodyDoc) lines.push(`Texto:\n${noteText(payload.bodyDoc)}`);
  };
  const payload = record(command.payload);
  append(payload); append(payload.activity); append(payload.schedule); append(record(payload.activity).schedule); append(payload.recurrence);
  return lines.join('\n');
}

export function outboxRecoveryTitle(command: CommandEnvelope): string {
  return commandLabels[command.command] ?? 'Alteração guardada';
}
