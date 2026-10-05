import { expect, it } from 'vitest';
import { validateCreation } from '../../server/gika/createPolicy';
const context = { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
it.each([
  { text: 'Quero agendar pagar João amanhã às 19h, não Maria.', title: 'pagar Maria' },
  { text: 'Quero agendar pagar João 10 reais amanhã às 19h', title: 'pagar João 1000 reais' },
])('legacy adapters cannot rearrange titles or change numeric content: $title', ({ text, title }) => {
  expect(() => validateCreation({ title, dueDate: '2026-10-06', dueTime: '19:00' }, text, context)).toThrow();
});
