import { appendFile } from 'node:fs/promises';

const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';
const transport = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== geminiUrl) return transport(input, init);
  if (String(init?.method ?? 'GET').toUpperCase() !== 'POST') return new Response('method not allowed', { status: 405 });
  const hasFixtureKey = new Headers(init.headers).has('x-goog-api-key');
  if (!hasFixtureKey) return new Response('missing local fixture transport header', { status: 401 });
  if (process.env.LEVE_CAPTURE_FIXTURE_LOG) {
    await appendFile(process.env.LEVE_CAPTURE_FIXTURE_LOG, `${JSON.stringify({ timestamp: new Date().toISOString(), endpoint: 'Gemini generateContent', method: 'POST', fixture: 'respond_turn/create_task', schema: 'Gemini candidates[0].content.parts[0].functionCall' })}\n`);
  }
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'respond_turn', args: { domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: null, proposals: [{ name: 'create_task', args: { title: 'Ir à feira', dueDate: '2026-10-09', dueTime: '19:00' } }] } } }] } }] });
};
