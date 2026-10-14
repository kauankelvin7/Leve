import type { CommandEnvelope, CommandResult } from '../../../../packages/domain/src/identity';
import { firebaseAuth } from './firebase';
import { deleteOutboxEntry, offlineEnabled, pendingCommands, queueCommand, withOutboxLeadership, type PendingCommand } from './outbox';
import { localTransaction, OUTBOX_STORE } from './localData';
import { OutboxLeadershipLostError, type LeadershipGuard } from './outboxLeadership';
import { requiresOutboxReconciliation } from './outboxPolicy';
import { apiErrorMessage } from '../app/statusPage';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

const validationLabels: Record<string, string> = {
  'recurrence.monthlyPolicy': 'a opção para meses sem esse dia',
  'recurrence.interval': 'o intervalo da repetição',
  'recurrence.until': 'a data final da repetição',
  'activity.title': 'o título da atividade',
  'activity.schedule': 'a data e o horário',
};

function responseMessage(status: number, data: { code?: string; message?: string; details?: unknown } | null) {
  const base = data?.message ?? apiErrorMessage(status);
  if (data?.code !== 'VALIDATION_ERROR' || !Array.isArray(data.details)) return base;
  const path = data.details.find((detail): detail is { path?: string } => Boolean(detail && typeof detail === 'object' && 'path' in detail))?.path;
  const label = path ? validationLabels[path] : undefined;
  return label ? `${base} Revise ${label} e tente novamente.` : `${base} Revise os campos destacados e tente novamente.`;
}

export async function apiRequest<Result>(path: string, options: RequestInit = {}, expectedUid?: string, beforeSend?: LeadershipGuard): Promise<Result> {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  let response: Response;
  async function request(forceRefresh: boolean) {
    let token: string;
    try { token = await user!.getIdToken(forceRefresh); }
    catch { throw new ApiError(401, 'AUTH_REQUIRED', 'Sua sessão expirou. Entre novamente.'); }
    if (expectedUid && (user!.uid !== expectedUid || firebaseAuth?.currentUser?.uid !== expectedUid)) throw new ApiError(401, 'AUTH_REQUIRED', 'Sua conta mudou. Entre novamente.');
    await beforeSend?.();
    if (firebaseAuth?.currentUser?.uid !== user!.uid) throw new ApiError(401, 'AUTH_REQUIRED', 'Sua conta mudou. Entre novamente.');
    options.signal?.throwIfAborted();
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
    if (failure instanceof ApiError || failure instanceof OutboxLeadershipLostError) throw failure;
    throw new ApiError(0, 'NETWORK_ERROR', 'A conexão falhou. Seu rascunho continua salvo neste aparelho.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.code ?? 'SERVICE_UNAVAILABLE', responseMessage(response.status, data), data?.details);
  if (!data) throw new ApiError(503, 'INVALID_RESPONSE', 'Não recebemos uma confirmação. Tente novamente.');
  return data as Result;
}

export async function sendCommand(command: CommandEnvelope, options: { queueOnNetworkError?: boolean; keepalive?: boolean; signal?: AbortSignal; expectedUid?: string } = {}): Promise<CommandResult> {
  const originatingUid = firebaseAuth?.currentUser?.uid;
  try { return await apiRequest('/commands', { method: 'POST', body: JSON.stringify(command), keepalive: options.keepalive, signal: options.signal }, options.expectedUid ?? originatingUid); }
  catch (failure) {
    const user = firebaseAuth?.currentUser;
    const queueable = options.queueOnNetworkError !== false && !command.command.startsWith('account.') && offlineEnabled(originatingUid);
    if (failure instanceof ApiError && failure.code === 'NETWORK_ERROR' && user && user.uid === originatingUid && queueable) {
      await queueCommand(user.uid, command);
      throw new ApiError(202, 'SAVED_LOCALLY', 'Salvo neste aparelho e aguardando conexão.');
    }
    throw failure;
  }
}

function assertReceipt(result: CommandResult, command: CommandEnvelope) {
  const payload = command.payload as { newSeriesId?: string } | null;
  const entityId = command.command === 'activity.updateFuture' ? payload?.newSeriesId : command.entityId;
  const createsRelatedEntity = command.command === 'activity.updateFuture' || command.command === 'shoppingList.createCycle';
  // Timer no-ops and notification devices may legitimately return a revision
  // derived from newer server state. Domain mutations otherwise advance exactly once.
  const flexibleRevision = ['timeEntry.pause', 'timeEntry.resume', 'timeEntry.stop', 'profile.completeTutorial', 'profile.activate'].includes(command.command)
    || command.command.startsWith('notificationDevice.');
  const revision = createsRelatedEntity ? 1 : command.expectedRevision === undefined || flexibleRevision ? undefined : command.expectedRevision + 1;
  if (!result || result.operationId !== command.operationId || result.entityId !== entityId
    || !Number.isInteger(result.revision) || result.revision < 1 || (revision !== undefined && result.revision !== revision) || !Number.isFinite(Date.parse(result.serverTime))
    || !['applied', 'alreadyApplied'].includes(result.result)) {
    throw new ApiError(503, 'INVALID_RESPONSE', 'Não recebemos uma confirmação. Tente novamente.');
  }
}

export async function flushOutbox(uid: string) {
  return withOutboxLeadership(uid, async guard => {
    const queued = (await pendingCommands(uid)).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const waiting = new Set(queued.map(entry => entry.operationId));
    for (const entry of queued) {
      if (firebaseAuth?.currentUser?.uid !== uid) break;
      if (entry.command.dependsOn?.some(operationId => waiting.has(operationId))) continue;
      try {
        const stillQueued = await localTransaction<PendingCommand | undefined>(OUTBOX_STORE, 'readonly', (store, resolve, reject) => {
          const request = store.get(entry.key);
          request.onsuccess = () => resolve(request.result as PendingCommand | undefined);
          request.onerror = () => reject(request.error);
        });
        if (!stillQueued) {
          waiting.delete(entry.operationId);
          continue;
        }
        if (requiresOutboxReconciliation(entry.createdAt, Date.now(), entry.command.clientCreatedAt)) {
          const receipt = await apiRequest<{ result: CommandResult | null }>(`/commands/${entry.operationId}`, {}, uid, guard);
          if (!receipt.result) {
            window.dispatchEvent(new CustomEvent('leve:outbox-conflict', { detail: 'Uma alteração antiga precisa ser revisada antes de tentar enviá-la novamente.' }));
            break;
          }
          assertReceipt(receipt.result, entry.command);
          await guard();
          if (firebaseAuth?.currentUser?.uid !== uid) break;
          await deleteOutboxEntry(uid, entry.operationId);
          waiting.delete(entry.operationId);
          continue;
        }
        const result = await apiRequest<CommandResult>('/commands', { method: 'POST', body: JSON.stringify(entry.command) }, uid, guard);
        assertReceipt(result, entry.command);
        await guard();
        if (firebaseAuth?.currentUser?.uid !== uid) break;
        await deleteOutboxEntry(uid, entry.operationId);
        waiting.delete(entry.operationId);
      } catch (failure) {
        if (failure instanceof OutboxLeadershipLostError || firebaseAuth?.currentUser?.uid !== uid) break;
        if (failure instanceof ApiError && (failure.code === 'NETWORK_ERROR' || failure.status >= 500)) break;
        window.dispatchEvent(new CustomEvent('leve:outbox-conflict', { detail: failure instanceof Error ? failure.message : 'Uma alteração pendente precisa ser revisada.' }));
        break;
      }
    }
  });
}
