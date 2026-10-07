const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

const notificationCue = /\b(?:notifi\w*|lembret\w*|lembre\w*|avis(?:a|e|ar|o|os|ando|ado)\w*|alert\w*)\b/u;
const allDayCue = /\b(?:dia\s+(?:todo|inteiro)|durante\s+o\s+dia|ao\s+longo\s+do\s+dia|all[\s-]?day)\b/u;
const capabilityCue = /\b(?:como|quando|onde|qual|o\s+que|tem|possui|faz|funciona|consegue|pode|podemos|sistema|leve|gika|voc[eê]|receb|envia|manda)\b/u;
const reminderActionCue = /^\s*(?:me\s+)?(?:avis\w*|notifi\w*|lembre\w*)\b/u;
const explicitReminderRequest = /\b(?:precis\w*|quer\w*|pod\w*|por\s+favor|me)\b[^.!?\n]{0,80}\b(?:avis\w*|notifi\w*|lembre\w*)\b/u;
const creationCue = /\b(?:cria\w*|adiciona\w*|agenda\w*|marca\w*|registra\w*|anota\w*|inclu[ai]\w*)\b/u;

/**
 * Notification questions are answered by the server so the assistant cannot
 * deny a capability that is already implemented or invent continuous alerts.
 * A mixed creation/notification request receives a capability clarification
 * instead of falling through to a provider failure; it never creates by itself.
 */
export function isNotificationCapabilityRequest(text: string) {
  const value = normalize(text).trim();
  if (!notificationCue.test(value)) return false;
  if (allDayCue.test(value) || explicitReminderRequest.test(value)) return true;
  if (creationCue.test(value)) return false;
  return capabilityCue.test(value) || reminderActionCue.test(value);
}

export function notificationCapabilityReply(text: string) {
  const value = normalize(text);
  if (allDayCue.test(value)) {
    return 'Sim, o Leve envia notificações. O aviso automático é pontual, no horário definido da atividade, quando as notificações estão ativadas neste aparelho. Para algo de dia inteiro, escolha um horário (por exemplo, 09:00) ou um lembrete antecipado; não há um aviso contínuo ao longo do dia.';
  }
  if (creationCue.test(value)) {
    return 'Sim — você não precisa pedir um lembrete separado. Em uma atividade com horário, o Leve envia uma notificação automática quando as notificações estão ativadas neste aparelho. Tente agendar apenas “ir à academia amanhã às 19:00” para eu preparar a tarefa.';
  }
  return 'Sim. O Leve envia uma notificação automática no horário de atividades com hora definida, desde que as notificações estejam ativadas neste aparelho. Lembretes antecipados podem ser escolhidos na própria atividade.';
}
