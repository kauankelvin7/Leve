import type { CommandEnvelope, CommandResult } from '../../../../packages/domain/src/identity';
import { firebaseAuth } from './firebase';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

export async function apiRequest<Result>(path: string, options: RequestInit = {}): Promise<Result> {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  let response: Response;
  async function request(forceRefresh: boolean) {
    let token: string;
    try { token = await user!.getIdToken(forceRefresh); }
    catch { throw new ApiError(401, 'AUTH_REQUIRED', 'Sua sessão expirou. Entre novamente.'); }
    return fetch(`/api${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(20_000),
      headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` },
    });
  }
  try {
    response = await request(false);
    if (response.status === 401) response = await request(true);
  } catch (failure) {
    if (failure instanceof ApiError) throw failure;
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível confirmar no servidor. Seu rascunho foi preservado.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.code ?? 'SERVICE_UNAVAILABLE', data?.message ?? 'Serviço indisponível. Tente novamente.', data?.details);
  if (!data) throw new ApiError(503, 'INVALID_RESPONSE', 'Não foi possível confirmar a operação.');
  return data as Result;
}

export function sendCommand(command: CommandEnvelope): Promise<CommandResult> {
  return apiRequest('/commands', { method: 'POST', body: JSON.stringify(command) });
}
