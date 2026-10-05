import { commandEnvelopeSchema, type CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { commandCreationResultSchema } from '../../../../../packages/domain/src/gika';
import { shoppingListInputSchema } from '../../../../../packages/domain/src/content';
import { createShoppingListDescriptorSchema, createdShoppingListSchema, shoppingListCommandFields, type CreateShoppingListDescriptor } from '../../../../../packages/domain/src/gikaShopping';
import { ApiError, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';

export async function executeCreateShoppingList(descriptor: CreateShoppingListDescriptor, command: CommandEnvelope, uid: string, signal: AbortSignal) {
  const list = createShoppingListDescriptorSchema.parse(descriptor);
  const parsed = commandEnvelopeSchema.parse(command);
  // Match the complete domain-owned envelope, not only the title or target.
  if (!parsed.gikaShopping) throw new ApiError(422, 'GIKA_INVALID_RESPONSE', 'Confira o nome da lista e tente novamente.');
  const canonical = shoppingListCommandFields(list, parsed.operationId, parsed.gikaShopping.requestTextHash);
  if (JSON.stringify({ ...parsed, payload: shoppingListInputSchema.parse(parsed.payload) }) !== JSON.stringify(canonical)) throw new ApiError(422, 'GIKA_INVALID_RESPONSE', 'Confira o nome da lista e tente novamente.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  const receipt = commandCreationResultSchema.parse(await sendCommand(parsed, { signal, expectedUid: uid, queueOnNetworkError: false }));
  if (receipt.operationId !== parsed.operationId || receipt.entityId !== parsed.entityId) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não recebi a confirmação da lista. Confira suas compras.');
  if (signal.aborted || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  return createdShoppingListSchema.parse({ ...list, id: receipt.entityId, revision: receipt.revision, result: receipt.result });
}
