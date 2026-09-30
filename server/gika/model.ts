/** Provider-independent boundary. No persistence, identity or command access. */
export type ModelContext = { today: string; timeZone: string; weekStartsOn: 0 | 1 };
export type ModelInput = { text: string; context: ModelContext };
export type ModelCall = { name: string; args: Record<string, unknown> };
export interface ModelAdapter { interpret(input: ModelInput, signal: AbortSignal): Promise<ModelCall[]> }
export type GikaFaultCode = 'GIKA_NOT_CONFIGURED' | 'GIKA_QUOTA' | 'GIKA_UNAVAILABLE' | 'GIKA_TIMEOUT' | 'GIKA_INVALID_RESPONSE' | 'GIKA_MALFORMED_CALL' | 'GIKA_POLICY';
export class GikaFault extends Error {
  constructor(public readonly code: GikaFaultCode) { super(code); }
}

/** Deadline also bounds transports/repositories that ignore AbortSignal. */
export async function bounded<T>(work: (signal: AbortSignal) => Promise<T>, parent: AbortSignal, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const cancellation = new Promise<never>((_resolve, reject) => {
    abort = () => { controller.abort(); reject(new GikaFault('GIKA_TIMEOUT')); };
    parent.addEventListener('abort', abort, { once: true });
    timer = setTimeout(abort, ms);
  });
  try {
    if (parent.aborted) throw new GikaFault('GIKA_TIMEOUT');
    return await Promise.race([work(controller.signal), cancellation]);
  } finally {
    clearTimeout(timer);
    if (abort) parent.removeEventListener('abort', abort);
    controller.abort();
  }
}
