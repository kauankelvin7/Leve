import { z } from 'zod';
import { shoppingListInputSchema } from './content.ts';
import { commandEnvelopeSchema, entityIdSchema, type CommandEnvelope } from './identity.ts';

export const createShoppingListDescriptorSchema = z.object({ title: shoppingListInputSchema.shape.title }).strict();
export const createShoppingListCallSchema = z.object({ name: z.literal('create_shopping_list'), args: createShoppingListDescriptorSchema }).strict();
export const shoppingListsCallSchema = z.object({ name: z.literal('get_shopping_lists'), args: z.object({}).strict() }).strict();
export const createdShoppingListSchema = createShoppingListDescriptorSchema.extend({
  id: entityIdSchema, revision: z.literal(1), result: z.enum(['applied', 'alreadyApplied']),
}).strict();
export const shoppingListReadItemSchema = z.object({
  id: entityIdSchema, title: shoppingListInputSchema.shape.title, revision: z.number().int().positive(),
  listKind: shoppingListInputSchema.shape.listKind,
  itemCount: z.number().int().min(0).max(200), pendingItemCount: z.number().int().min(0).max(200),
}).strict().refine(item => item.pendingItemCount <= item.itemCount);
export const shoppingListsResultSchema = z.object({
  items: z.array(shoppingListReadItemSchema).max(50), partial: z.boolean(), cached: z.literal(false),
}).strict().refine(result => new Set(result.items.map(item => item.id)).size === result.items.length);
export type CreateShoppingListDescriptor = z.infer<typeof createShoppingListDescriptorSchema>;
export type CreatedShoppingList = z.infer<typeof createdShoppingListSchema>;
export type ShoppingListsResult = z.infer<typeof shoppingListsResultSchema>;

/** A list descriptor never authorizes items, templates, cycles or any other command. */
export function shoppingListCommandFields(descriptor: CreateShoppingListDescriptor, requestId: string, requestTextHash: string): CommandEnvelope {
  const list = createShoppingListDescriptorSchema.parse(descriptor);
  const operationId = z.uuid().parse(requestId);
  return commandEnvelopeSchema.parse({
    command: 'shoppingList.create', operationId, entityId: operationId, expectedRevision: 0,
    payload: shoppingListInputSchema.parse({ title: list.title, listKind: 'regular', cycleKey: null }),
    gikaShopping: { requestTextHash },
  });
}
export async function shoppingListEnvelope(descriptor: CreateShoppingListDescriptor, request: { requestId: string; text: string }): Promise<CommandEnvelope> {
  const text = z.string().trim().min(1).max(2000).parse(request.text);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const requestTextHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return shoppingListCommandFields(descriptor, request.requestId, requestTextHash);
}
