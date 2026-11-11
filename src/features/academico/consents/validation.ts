import type { ConsentDraft } from './types.ts';
import { fieldMessages } from './types.ts';

export const registrationFields = ['file', 'signedOn', 'receivedOn'] as const;
const labels: Record<string, string> = { file: 'Documento firmado', signedOn: 'Fecha de firma', receivedOn: 'Fecha de recepción' };
export function consentFieldMessage(field: string, reason: string) {
  if (reason === 'required') {
    if (field === 'file') return 'Selecciona un documento firmado.';
    if (field === 'signedOn') return 'Indica la fecha de firma.';
    if (field === 'receivedOn') return 'Indica la fecha de recepción.';
  }
  return `${labels[field] ? `${labels[field]}: ` : ''}${fieldMessages[reason] ?? 'No pudimos validar estos datos. Revisa la información antes de continuar.'}`;
}
function realDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateConsentDraft(draft: Pick<ConsentDraft, 'file' | 'signedOn' | 'receivedOn'>, now = new Date()) {
  const errors: Record<string, string> = {};
  if (!draft.file) errors.file = consentFieldMessage('file', 'required');
  else if (!draft.file.size) errors.file = 'El documento firmado está vacío. Selecciona un archivo con contenido.';
  else if (draft.file.size > 10485760) errors.file = consentFieldMessage('file', 'too_large');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  for (const field of ['signedOn', 'receivedOn'] as const) {
    const value = draft[field];
    if (!value) errors[field] = consentFieldMessage(field, 'required');
    else if (!realDate(value)) errors[field] = consentFieldMessage(field, 'invalid_format');
    else if (value > today) errors[field] = consentFieldMessage(field, 'future_date');
  }
  if (!errors.signedOn && !errors.receivedOn && draft.signedOn > draft.receivedOn) errors.signedOn = consentFieldMessage('signedOn', 'date_order');
  return errors;
}
