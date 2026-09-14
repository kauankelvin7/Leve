import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { commandEnvelopeSchema, type SessionResult, type UserProfile } from '../packages/domain/src/identity.ts';
import { auth, db } from './platform/firebase.ts';
import { activateAccount, updateProfile, completeTutorial } from './commands/identity.ts';
import { AppError } from './errors.ts';
import { contentCommand } from './commands/content.ts';
import { backendLog, fingerprint } from './logger.ts';
import { deleteAccount, exportAccount, importAccount, resumeAccountDeletions } from './account-data.ts';
import { notificationCommand } from './commands/notifications.ts';
import { emptyTrash } from './commands/trash.ts';
import { materializeRecurringActivities, processReminderTick, purgeExpiredContent, verifyTick } from './reminders.ts';

export const app = express();
app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const correlationId = randomUUID();
  const startedAt = performance.now();
  response.locals.correlationId = correlationId;
  response.setHeader('X-Correlation-ID', correlationId);
  backendLog('debug', 'http.request.started', { correlationId, method: request.method, path: request.path });
  response.once('finish', () => backendLog('debug', 'http.request.completed', {
    correlationId,
    method: request.method,
    path: request.path,
    status: response.statusCode,
    durationMs: Math.round(performance.now() - startedAt),
  }));
  response.once('close', () => {
    if (!response.writableEnded) backendLog('warn', 'http.request.aborted', { correlationId, method: request.method, path: request.path });
  });
  next();
});
app.get('/api/health', (_request, response) => response.json({
  status: 'ok',
  version: process.env.VITE_APP_VERSION ?? process.env.npm_package_version ?? 'unknown',
  timestamp: new Date().toISOString(),
}));
app.post('/api/internal/tick', async (request, response) => { verifyTick(request); const reminders = await processReminderTick(); const recurrence = await materializeRecurringActivities(); const trash = await purgeExpiredContent(); const deletions = await resumeAccountDeletions(); response.json({ reminders, recurrence, trash, deletions }); });
app.use('/api', async (request, response, next) => {
  const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  try {
    response.locals.identity = await auth.verifyIdToken(token, true);
    backendLog('debug', 'firebase.auth.token_verified', { correlationId: response.locals.correlationId, identity: fingerprint(response.locals.identity.uid) });
  } catch (error) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Sua sessão expirou. Entre novamente.', undefined, error);
  }
  next();
});
app.use(express.json({ limit: '10mb', strict: true }));
app.get('/api/session', async (_request, response) => {
  const identity = response.locals.identity;
  backendLog('debug', 'firebase.firestore.session_read.started', { correlationId: response.locals.correlationId, identity: fingerprint(identity.uid) });
  const [profile, membership, controls] = await db.getAll(db.doc(`users/${identity.uid}`), db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'));
  const memberState = membership?.data()?.state ?? 'none';
  const result: SessionResult = {
    uid: identity.uid, email: identity.email ?? null, emailVerified: identity.email_verified === true,
    membership: memberState,
    profile: memberState === 'active' ? (profile?.data() as UserProfile ?? null) : null,
    serviceMode: controls?.data()?.mode ?? 'normal',
  };
  backendLog('debug', 'firebase.firestore.session_read.completed', { correlationId: response.locals.correlationId, identity: fingerprint(identity.uid), membership: memberState });
  response.json(result);
});
app.get('/api/account/export', async (_request, response) => {
  response.setHeader('Content-Disposition', `attachment; filename="leve-export-${new Date().toISOString().slice(0, 10)}.json"`);
  response.json(await exportAccount(response.locals.identity));
});
app.get('/api/commands/:operationId', async (request, response) => {
  const operationId = z.uuid().parse(request.params.operationId);
  const receipt = await db.doc(`commandReceipts/${response.locals.identity.uid}_${operationId}`).get();
  response.json({ result: receipt.exists ? receipt.data()?.response ?? null : null });
});
app.post('/api/commands', async (request, response) => {
  const command = commandEnvelopeSchema.parse(request.body);
  const identity = response.locals.identity;
  response.locals.command = command.command;
  if (command.command === 'profile.completeTutorial') { response.json(await completeTutorial(identity, command)); return; }
  if (command.command === 'trash.empty') { response.json(await emptyTrash(identity, command)); return; }
  if (command.command === 'diagnostic.report') {
    const diagnostic = z.object({ surface: z.enum(['calendar', 'content']), code: z.enum(['permission-denied', 'failed-precondition', 'unavailable', 'resource-exhausted', 'unauthenticated', 'cancelled', 'unknown', 'deadline-exceeded', 'internal']) }).strict().parse(command.payload);
    backendLog('warn', 'client.query_failed', { ...diagnostic, identity: fingerprint(identity.uid), correlationId: response.locals.correlationId });
    response.json({ received: true }); return;
  }
  backendLog('debug', 'command.dispatch.started', {
    correlationId: response.locals.correlationId,
    command: command.command,
    identity: fingerprint(identity.uid),
    operation: fingerprint(command.operationId),
    expectedRevision: command.expectedRevision,
  });
  const result = command.command === 'account.activate'
    ? await activateAccount(identity, command)
    : command.command === 'account.import'
      ? await importAccount(identity, command)
      : command.command === 'account.delete'
        ? await deleteAccount(identity, command)
        : command.command.startsWith('notificationDevice.')
          ? await notificationCommand(identity, command)
    : command.command === 'profile.update'
      ? await updateProfile(identity, command)
      : await contentCommand(identity, command);
  backendLog('debug', 'command.dispatch.completed', { correlationId: response.locals.correlationId, command: command.command, result: result.result });
  response.json(result);
});
app.use((_request, _response, next) => next(new AppError(404, 'NOT_FOUND', 'Não foi possível encontrar este recurso.')));
const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const correlationId = response.locals.correlationId;
  const context = { correlationId, method: request.method, path: request.path, command: response.locals.command };
  if (error instanceof ZodError) {
    backendLog('warn', 'request.validation_failed', { ...context, issues: error.issues.map(issue => ({ path: issue.path.join('.'), code: issue.code })) });
    response.status(422).json({ code: 'VALIDATION_ERROR', message: 'Confira os campos informados.', details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })), correlationId }); return;
  }
  if (error instanceof AppError) {
    if (error.status === 429) response.setHeader('Retry-After', '60');
    backendLog(error.status >= 500 ? 'error' : 'warn', error.cause ? 'backend.operation_failed' : 'backend.operation_rejected', { ...context, status: error.status, publicCode: error.code }, error.cause);
    response.status(error.status).json({ code: error.code, message: error.message, details: error.details, correlationId }); return;
  }
  if (error?.type === 'entity.too.large') {
    backendLog('warn', 'request.payload_too_large', context, error);
    response.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Conteúdo acima do limite permitido.', correlationId }); return;
  }
  if (error instanceof SyntaxError) {
    backendLog('warn', 'request.invalid_json', context, error);
    response.status(400).json({ code: 'VALIDATION_ERROR', message: 'JSON inválido.', correlationId }); return;
  }
  const quota = error?.code === 8 || error?.code === 'resource-exhausted';
  backendLog('error', quota ? 'firebase.quota_exceeded' : 'backend.unexpected_error', { ...context, publicCode: quota ? 'QUOTA_EXCEEDED' : 'SERVICE_UNAVAILABLE' }, error);
  response.status(503).json({ code: quota ? 'QUOTA_EXCEEDED' : 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível. Tente novamente mais tarde.', correlationId });
};
app.use(errorHandler);
