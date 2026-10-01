import { createGeminiAdapter, GEMINI_MODEL } from '../server/gika/gemini.ts';
import { Temporal } from '@js-temporal/polyfill';
import { validateCalls } from '../server/gika/policy.ts';
// Run only with a Developer API key from a Free Tier project without billing.
// No setup, billing, fallback, persistence, private agenda data or secret logging.
if (!process.env.GEMINI_API_KEY?.trim()) {
  console.error('BLOCKED: GEMINI_API_KEY ausente; nenhum request enviado.');
  process.exitCode = 2;
} else {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  try {
    const adapter = createGeminiAdapter();
    const cases = [
      { text: 'O que tenho hoje?', name: 'get_today' },
      { text: 'O que tenho depois de amanhã?', name: 'get_day', date: Temporal.PlainDate.from(today).add({ days: 2 }).toString() },
    ];
    for (const sample of cases) {
      const input = { text: sample.text, context: { today, timeZone: 'America/Sao_Paulo', weekStartsOn: 1 } };
      const calls = validateCalls(await adapter.interpret(input, AbortSignal.timeout(12_000)));
      if (calls.length !== 1 || calls[0].name !== sample.name || (sample.date && calls[0].args.date !== sample.date)) throw new Error('GIKA_SMOKE_TOOL_MISMATCH');
    }
    console.log(`PASS: ${GEMINI_MODEL}, medium, E01/E02; nenhuma agenda consultada ou alterada.`);
  } catch (error) {
    // Never print an upstream error or secret, only the normalized public code.
    const code = typeof error?.code === 'string' && /^GIKA_[A-Z_]+$/.test(error.code) ? error.code : 'GIKA_SMOKE_FAILED';
    console.error(`FAIL: ${code}`); process.exitCode = 1;
  }
}
