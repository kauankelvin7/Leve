import { apiRequest, ApiError } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
import { gikaRequestSchema, gikaResponseSchema, type GikaAdapter } from './conversation';
export const apiAdapter: GikaAdapter = async (request, signal) => {
  const uid = firebaseAuth?.currentUser?.uid;
  const input = gikaRequestSchema.parse(request);
  const active = AbortSignal.any([signal, AbortSignal.timeout(18_000)]);
  const response = gikaResponseSchema.parse(await apiRequest('/gika/respond', { method: 'POST', body: JSON.stringify(input), signal: active }));
  if (active.aborted || !uid || firebaseAuth?.currentUser?.uid !== uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  if (response.simulated) throw new ApiError(503, 'GIKA_INVALID_RESPONSE', 'Não consegui responder agora.');
  return response;
};
