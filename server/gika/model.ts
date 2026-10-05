import type { z } from 'zod';
import type { gikaIntentClassificationSchema } from '../../packages/domain/src/gika.ts';
import type { SemanticTurn } from './semanticTurn.ts';
/** Provider-independent boundary. No persistence, identity or command access. */
export type ModelContext = { today: string; timeZone: string; weekStartsOn: 0 | 1 };
export type ModelInput = { text: string; context: ModelContext; turnOnly?: boolean; classifyOnly?: boolean; agendaIntent?: 'AGENDA_QUERY' | 'AGENDA_ACTION'; conversation?: { role: 'user' | 'assistant'; text: string }[]; planning?: { startDate: string; endDate: string; tasks: {ref:number;title:string;status:string;dueDate:string;dueTime:string|null;timeZone:string;recurring:boolean}[] } };
export type ModelCall = { name: string; args: Record<string, unknown> };
export interface ModelAdapter {
  readonly diagnosticModel?: string;
  /** Only trusted in-process classifiers may opt out; provider adapters reserve by default. */
  readonly classificationUsesProvider?: boolean;
  turn?(input: ModelInput, signal: AbortSignal, diagnostics?: { correlationId: string }): Promise<SemanticTurn>;
  classify?(input: ModelInput, signal: AbortSignal, diagnostics?: { correlationId: string }): Promise<z.infer<typeof gikaIntentClassificationSchema>>;
  interpret(input: ModelInput, signal: AbortSignal, diagnostics?: { correlationId: string }): Promise<ModelCall[]>;
}
export type GikaFaultCode = 'GIKA_NOT_CONFIGURED' | 'GIKA_QUOTA' | 'GIKA_UNAVAILABLE' | 'GIKA_TIMEOUT' | 'GIKA_INVALID_RESPONSE' | 'GIKA_MALFORMED_CALL' | 'GIKA_POLICY';
export class GikaFault extends Error {
  readonly code: GikaFaultCode;
  readonly diagnosticClass?: 'ServiceControlsMissing' | 'ServiceControlsRestricted' | 'ServiceControlsInvalid' | 'QuotaStateInvalid';
  constructor(code: GikaFaultCode, diagnosticClass?: GikaFault['diagnosticClass']) { super(code); this.code = code; this.diagnosticClass = diagnosticClass; }
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
