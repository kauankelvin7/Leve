import { GIKA_MAX_CONTEXT_TURNS, GIKA_MAX_REQUEST_BYTES } from '../../../../../packages/domain/src/gika';
import type { GikaMessage, GikaRequest } from './conversation';

/** A projection for interpretation, never a command, identity, receipt or confirmation grant. */
function assistantContext(message: GikaMessage): string {
  if (message.contextOutcome) {
    // The bridge emits this only after a checked ACK or an explicit local cancellation.
    // It supersedes the original preview/snapshot so follow-ups do not reuse old dates.
    return `Resultado da interface: ${JSON.stringify(message.contextOutcome)}. Confira o estado atual da agenda antes de outra alteração.`.slice(0, 1000);
  }
  const facts: unknown[] = [];
  if (message.createdShoppingList) facts.push({ outcome: 'shopping_list_created', title: message.createdShoppingList.title });
  if (message.shoppingLists) facts.push({ outcome: 'shopping_lists_read', partial: message.shoppingLists.partial,
    items: message.shoppingLists.items.slice(0, 5).map(({ title, listKind, itemCount, pendingItemCount }) => ({ title, listKind, itemCount, pendingItemCount })) });
  if (message.createdTask) {
    const { title, dueDate, dueTime } = message.createdTask;
    facts.push({ outcome: 'created', title, dueDate, dueTime });
  }
  if (message.completedTask) {
    const { title, dueDate } = message.completedTask;
    facts.push({ outcome: 'completed', title, dueDate });
  }
  if (message.updatedTask) {
    const { title, dueDate } = message.updatedTask;
    facts.push({ outcome: 'renamed', title, dueDate });
  }
  if (message.rescheduleTask) {
    const { title, dueDate, dueTime, patch } = message.rescheduleTask;
    facts.push({ outcome: 'preview_only', title, dueDate, dueTime, proposed: patch });
  }
  const recurring = message.recurrenceConfirmation?.effect ?? message.recurrenceChoice?.proposal;
  if (recurring) {
    const { title, dueDate, dueTime } = recurring.task;
    facts.push({ outcome: 'preview_only', title, dueDate, dueTime, proposed: recurring.patch });
  }
  if (message.batchConfirmation) facts.push({ outcome: 'preview_only', operation: message.batchConfirmation.plan.action,
    tasks: message.batchConfirmation.plan.items.map(item => ({ title: item.title, ...item.before, proposed: item.patch })) });
  if (message.confirmation || message.batchConfirmation || message.recurrenceConfirmation || message.recurrenceChoice) {
    facts.push({ confirmation: 'Use the original confirmation controls. Conversation never confirms this preview.' });
  }
  for (const read of message.reads ?? []) {
    facts.push({ outcome: 'read', startDate: read.startDate, endDate: read.endDate, partial: read.partial,
      // Only a small recent reference window, not another copy of the full agenda.
      items: read.items.slice(0, 5).map(item => ({ title: item.title, status: item.status,
        date: item.schedule.type === 'task' ? item.schedule.dueDate : item.schedule.startDate,
        ...(item.schedule.type === 'task' ? { time: item.schedule.dueTime } : {}) })) });
  }
  return `${message.text}${facts.length ? `\nContexto da interface: ${JSON.stringify(facts)}` : ''}`.slice(0, 1000);
}

export function conversationContext(messages: GikaMessage[], request: Pick<GikaRequest, 'requestId' | 'text'>): NonNullable<GikaRequest['conversation']> {
  const pairs = messages.flatMap((message, index) => {
    const user = messages[index - 1];
    if (message.role !== 'assistant' || message.simulated || user?.role !== 'user') return [];
    return [{ role: 'user' as const, text: user.text.slice(0, 1000) },
      { role: 'assistant' as const, text: assistantContext(message) }];
  }).slice(-GIKA_MAX_CONTEXT_TURNS);
  // Keep complete pairs, count UTF-8 bytes, and reserve room for the original request.
  while (pairs.length && new TextEncoder().encode(JSON.stringify({ ...request, conversation: pairs })).byteLength > GIKA_MAX_REQUEST_BYTES) pairs.splice(0, 2);
  return pairs;
}
