import { GIKA_MAX_CONTEXT_TURNS, GIKA_MAX_REQUEST_BYTES } from '../../../../../packages/domain/src/gika';
import type { GikaMessage, GikaRequest } from './conversation';

/** A projection for interpretation, never a command, identity, receipt or confirmation grant. */
function assistantContext(message: GikaMessage): string {
  if (message.contextOutcome) {
    // The bridge emits this only after a checked ACK or an explicit local cancellation.
    // Keep the outcome private to the UI: the provider must not receive task titles,
    // dates, descriptions or confirmation material from a previous turn.
    const state = typeof message.contextOutcome.state === 'string' ? message.contextOutcome.state : 'updated';
    return `Resultado da interface: ${state}. Confira o estado atual da agenda antes de outra alteração.`;
  }
  const facts: unknown[] = [];
  if (message.createdShoppingList) facts.push({ outcome: 'shopping_list_created' });
  if (message.shoppingLists) facts.push({ outcome: 'shopping_lists_read', partial: message.shoppingLists.partial });
  if (message.createdTask) facts.push({ outcome: 'created' });
  if (message.completedTask) facts.push({ outcome: 'completed' });
  if (message.updatedTask) facts.push({ outcome: 'renamed' });
  if (message.rescheduleTask) facts.push({ outcome: 'preview_only' });
  const recurring = message.recurrenceConfirmation?.effect ?? message.recurrenceChoice?.proposal;
  if (recurring) facts.push({ outcome: 'preview_only' });
  if (message.batchConfirmation) facts.push({ outcome: 'preview_only', operation: message.batchConfirmation.plan.action });
  if (message.confirmation || message.batchConfirmation || message.recurrenceConfirmation || message.recurrenceChoice) {
    facts.push({ confirmation: 'Use the original confirmation controls. Conversation never confirms this preview.' });
  }
  for (const read of message.reads ?? []) {
    facts.push({ outcome: 'read', partial: read.partial, itemCount: read.items.length });
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
