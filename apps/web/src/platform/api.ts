import type { CommandEnvelope, CommandResult } from '../../../../packages/domain/src/identity';
import { firebaseAuth } from './firebase';
import { offlineEnabled, pendingCommands, queueCommand, removeCommand, withOutboxLeadership } from './outbox';
import { requiresOutboxReconciliation } from './outboxPolicy';
import { apiErrorMessage } from '../app/statusPage';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
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
    throw new ApiError(0, 'NETWORK_ERROR', 'A conexão falhou. Seu rascunho continua salvo neste aparelho.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.code ?? 'SERVICE_UNAVAILABLE', data?.message ?? apiErrorMessage(response.status), data?.details);
  if (!data) throw new ApiError(503, 'INVALID_RESPONSE', 'Não recebemos uma confirmação. Tente novamente.');
  return data as Result;
}

export async function sendCommand(command: CommandEnvelope, options: { queueOnNetworkError?: boolean; keepalive?: boolean } = {}): Promise<CommandResult> {
  const originatingUid = firebaseAuth?.currentUser?.uid;
  try { return await apiRequest('/commands', { method: 'POST', body: JSON.stringify(command), keepalive: options.keepalive }); }
  catch (failure) {
    const user = firebaseAuth?.currentUser;
    const queueable = options.queueOnNetworkError !== false && !command.command.startsWith('account.') && offlineEnabled();
    if (failure instanceof ApiError && failure.code === 'NETWORK_ERROR' && user && user.uid === originatingUid && queueable) {
      await queueCommand(user.uid, command);
      throw new ApiError(202, 'SAVED_LOCALLY', 'Salvo neste aparelho e aguardando conexão.');
    }
    throw failure;
  }
}

export async function flushOutbox(uid: string) {
  return withOutboxLeadership(uid, async () => {
    const queued = (await pendingCommands(uid)).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const waiting = new Set(queued.map(entry => entry.operationId));
    for (const entry of queued) {
      if (firebaseAuth?.currentUser?.uid !== uid) break;
      if (entry.command.dependsOn?.some(operationId => waiting.has(operationId))) continue;
      try {
        if (requiresOutboxReconciliation(entry.createdAt)) {
          const receipt = await apiRequest<{ result: CommandResult | null }>(`/commands/${entry.operationId}`);
          if (!receipt.result) {
            window.dispatchEvent(new CustomEvent('leve:outbox-conflict', { detail: 'Uma alteração antiga precisa ser revisada antes de tentar enviá-la novamente.' }));
            break;
          }
          await removeCommand(uid, entry.operationId);
          waiting.delete(entry.operationId);
          continue;
        }
        await apiRequest('/commands', { method: 'POST', body: JSON.stringify(entry.command) });
        await removeCommand(uid, entry.operationId);
        waiting.delete(entry.operationId);
      } catch (failure) {
        if (failure instanceof ApiError && (failure.code === 'NETWORK_ERROR' || failure.status >= 500)) break;
        window.dispatchEvent(new CustomEvent('leve:outbox-conflict', { detail: failure instanceof Error ? failure.message : 'Uma alteração pendente precisa ser revisada.' }));
        break;
      }
    }
  });
}
