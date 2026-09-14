import { createHash } from 'node:crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = process.env.LOG_LEVEL as LogLevel | undefined;
const minimumLevel = configuredLevel && configuredLevel in levels
  ? configuredLevel
  : process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const sensitiveKey = /authorization|cookie|token|password|secret|private.?key|client.?email|api.?key|credential/i;

export function fingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function redactLogText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_API_KEY]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .slice(0, 8_000);
}

function sanitize(value: unknown, key = '', depth = 0): unknown {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return redactLogText(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'undefined') return undefined;
  if (depth >= 4) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 25).map(item => sanitize(item, '', depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey, depth + 1)]));
  }
  return redactLogText(String(value));
}

export function serializeBackendError(error: unknown, depth = 0): LogContext {
  if (!(error instanceof Error)) return { name: typeof error, message: redactLogText(String(error)) };
  const technical = error as Error & { code?: unknown; status?: unknown; cause?: unknown };
  const serialized: LogContext = {
    name: technical.name,
    message: redactLogText(technical.message),
    ...(technical.code !== undefined ? { code: sanitize(technical.code, 'errorCode') } : {}),
    ...(technical.status !== undefined ? { status: sanitize(technical.status, 'errorStatus') } : {}),
    ...(technical.stack ? { stack: redactLogText(technical.stack).split('\n').slice(0, 16).join('\n') } : {}),
  };
  if (technical.cause !== undefined && depth < 2) serialized.cause = serializeBackendError(technical.cause, depth + 1);
  return serialized;
}

export function backendLog(level: LogLevel, event: string, context: LogContext = {}, error?: unknown) {
  if (levels[level] < levels[minimumLevel]) return;
  const record = sanitize({
    timestamp: new Date().toISOString(),
    level,
    service: 'leve-backend',
    event,
    ...context,
    ...(error === undefined ? {} : { error: serializeBackendError(error) }),
  });
  const line = JSON.stringify(record);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'info') console.info(line);
  else console.debug(line);
}
