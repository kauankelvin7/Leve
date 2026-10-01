import { z } from 'zod';
import { commandEnvelopeSchema } from './identity.ts';

// Software-owned context from an acknowledged M3-T2 creation. Never model arguments.
export const creationUndoContextSchema = z.object({
  uid: z.string().min(1).max(128), creationOperationId: z.uuid(), entityId: z.uuid(), revision: z.literal(1),
}).strict().refine(value => value.entityId === value.creationOperationId, 'Criação inválida.');
export type CreationUndoContext = z.infer<typeof creationUndoContextSchema>;
export const creationUndoResultSchema = z.object({ operationId: z.uuid(), entityId: z.uuid(), revision: z.literal(2),
  serverTime: z.iso.datetime(), result: z.enum(['applied', 'alreadyApplied']) }).strict();

export async function creationUndoOperationId(context: CreationUndoContext): Promise<string> {
  const input = creationUndoContextSchema.parse(context);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['gika.undo-create.v1', input.uid, input.creationOperationId])));
  const bytes = new Uint8Array(digest).slice(0, 16);
  // UUIDv8: deterministic software namespace; UID also scopes the existing receipt.
  bytes[6] = (bytes[6]! & 15) | 128; bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function creationUndoEnvelope(context: CreationUndoContext) {
  const input = creationUndoContextSchema.parse(context);
  return commandEnvelopeSchema.parse({ command: 'activity.trash', operationId: await creationUndoOperationId(input),
    entityId: input.entityId, expectedRevision: input.revision, payload: {},
    gikaUndo: { uid: input.uid, creationOperationId: input.creationOperationId } });
}
