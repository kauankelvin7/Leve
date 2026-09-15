import { Temporal } from '@js-temporal/polyfill';

export function formatCivilDate(value: string | null | undefined) {
  if (!value) return '';
  try {
    return Temporal.PlainDate.from(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function formatCivilDateLong(value: string) {
  try {
    return Temporal.PlainDate.from(value).toLocaleString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function formatDateTimeDate(value: string | null | undefined) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR');
}
