import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { commandEnvelopeSchema, type SessionResult, type UserProfile } from '../packages/domain/src/identity';
import { auth, db } from './platform/firebase';
import { acceptInvite, updateProfile } from './commands/identity';
import { AppError } from './errors';
import { contentCommand } from './commands/content';

export const app = express();
app.disable('x-powered-by');
app.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.locals.correlationId = randomUUID();
  next();
});
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api', async (request, response, next) => {
  const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  try { response.locals.identity = await auth.verifyIdToken(token, true); }
  catch { throw new AppError(401, 'AUTH_REQUIRED', 'Sua sessão expirou. Entre novamente.'); }
  next();
});
app.use(express.json({ limit: '256kb', strict: true }));
app.get('/api/session', async (_request, response) => {
  const identity = response.locals.identity;
  const [profile, membership, controls] = await db.getAll(db.doc(`users/${identity.uid}`), db.doc(`memberships/${identity.uid}`), db.doc('serviceControls/global'));
  const memberState = membership?.data()?.state ?? 'none';
  const result: SessionResult = {
    uid: identity.uid, email: identity.email ?? null, emailVerified: identity.email_verified === true,
    membership: memberState,
    profile: memberState === 'active' ? (profile?.data() as UserProfile ?? null) : null,
    serviceMode: controls?.data()?.mode ?? 'restricted',
  };
  response.json(result);
});
app.post('/api/commands', async (request, response) => {
  const command = commandEnvelopeSchema.parse(request.body);
  const identity = response.locals.identity;
  const result = command.command === 'invite.accept'
    ? await acceptInvite(identity, command)
    : command.command === 'profile.update'
      ? await updateProfile(identity, command)
      : await contentCommand(identity, command);
  response.json(result);
});
app.use((_request, _response, next) => next(new AppError(404, 'NOT_FOUND', 'Não foi possível encontrar este recurso.')));
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const correlationId = response.locals.correlationId;
  if (error instanceof ZodError) { response.status(422).json({ code: 'VALIDATION_ERROR', message: 'Confira os campos informados.', details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })), correlationId }); return; }
  if (error instanceof AppError) {
    if (error.status === 429) response.setHeader('Retry-After', '60');
    response.status(error.status).json({ code: error.code, message: error.message, details: error.details, correlationId }); return;
  }
  if (error?.type === 'entity.too.large') { response.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Conteúdo acima do limite permitido.', correlationId }); return; }
  if (error instanceof SyntaxError) { response.status(400).json({ code: 'VALIDATION_ERROR', message: 'JSON inválido.', correlationId }); return; }
  const quota = error?.code === 8 || error?.code === 'resource-exhausted';
  console.error(JSON.stringify({ correlationId, code: quota ? 'QUOTA_EXCEEDED' : 'INTERNAL_ERROR' }));
  response.status(503).json({ code: quota ? 'QUOTA_EXCEEDED' : 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível. Tente novamente mais tarde.', correlationId });
};
app.use(errorHandler);
