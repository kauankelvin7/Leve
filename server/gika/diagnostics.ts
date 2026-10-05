import { backendLog } from '../logger.ts';
import { GikaFault } from './model.ts';

export type GikaStage = 'config_error' | 'payload' | 'request_started' | 'fetch_exception'
  | 'upstream_response' | 'parse_error' | 'timeout' | 'authorize_receipt' | 'recover_batch'
  | 'recover_mutation' | 'authorization' | 'quota' | 'model' | 'policy' | 'read';

const networkClasses: Record<string, string> = {
  ENOTFOUND: 'DnsResolutionError', EAI_AGAIN: 'DnsResolutionError',
  ECONNREFUSED: 'ConnectionRefusedError', ECONNRESET: 'ConnectionResetError',
  ETIMEDOUT: 'NetworkTimeoutError', UND_ERR_CONNECT_TIMEOUT: 'NetworkTimeoutError',
  UND_ERR_HEADERS_TIMEOUT: 'NetworkTimeoutError', UND_ERR_SOCKET: 'SocketError',
  ERR_TLS_CERT_ALTNAME_INVALID: 'TlsError', CERT_HAS_EXPIRED: 'TlsError',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'TlsError', UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'TlsError',
  ERR_INVALID_CHAR: 'InvalidHeaderError', UND_ERR_INVALID_ARG: 'InvalidRequestError',
};

function errorClass(error: unknown): string {
  if (error instanceof GikaFault) return error.diagnosticClass ?? 'GikaFault';
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && Object.hasOwn(networkClasses, code)) return networkClasses[code]!;
  }
  if (error instanceof TypeError) return 'TypeError';
  if (error instanceof SyntaxError) return 'SyntaxError';
  if (error instanceof RangeError) return 'RangeError';
  if (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name)) return error.name;
  return 'Error';
}

/** Only closed technical classifications; never use messages, stacks or arbitrary names/codes. */
export function safeGikaError(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  return { errorClass: errorClass(error), ...(cause === undefined ? {} : { causeClass: errorClass(cause) }) };
}

export function gikaDiagnostic(stage: GikaStage, context: {
  correlationId?: string; model: string; phase?: 'semantic' | 'classification' | 'interpretation' | 'planning'; upstreamStatus?: number; apiKeyPresent?: boolean; error?: unknown;
}) {
  backendLog(context.error === undefined ? 'info' : 'warn',
    stage === 'upstream_response' ? 'gika.upstream.response' : 'gika.diagnostic', {
      correlationId: context.correlationId, model: context.model, stage,
      ...(context.phase === undefined ? {} : { phase: context.phase }),
      ...(context.upstreamStatus === undefined ? {} : { upstreamStatus: context.upstreamStatus }),
      ...(context.apiKeyPresent === undefined ? {} : { keyPresent: context.apiKeyPresent }),
      ...(context.error === undefined ? {} : safeGikaError(context.error)),
    });
}
