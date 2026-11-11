import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConsentDraft, consentFieldMessage } from '../../src/features/academico/consents/validation.ts';

const now = new Date('2026-11-10T04:59:59Z'); // Still November 9 in Colombia.
const draft = { file: new File(['synthetic'], 'consent.pdf'), signedOn: '2026-11-09', receivedOn: '2026-11-09' };
test('CA-01: missing dates identify exactly the missing fields, without a spurious order error', () => {
  assert.deepEqual(validateConsentDraft({ ...draft, signedOn: '', receivedOn: '' }, now), { signedOn: 'Indica la fecha de firma.', receivedOn: 'Indica la fecha de recepción.' });
  assert.deepEqual(validateConsentDraft({ ...draft, receivedOn: '' }, now), { receivedOn: 'Indica la fecha de recepción.' });
  assert.deepEqual(validateConsentDraft({ ...draft, signedOn: '' }, now), { signedOn: 'Indica la fecha de firma.' });
});
test('CA-03: real dates, ordering and future dates use the day in Colombia', () => {
  assert.match(validateConsentDraft({ ...draft, receivedOn: '2026-11-08' }, now).signedOn, /anterior o igual/);
  assert.match(validateConsentDraft({ ...draft, signedOn: '2026-02-30' }, now).signedOn, /formato/);
  assert.match(validateConsentDraft({ ...draft, receivedOn: '2026-11-10' }, now).receivedOn, /futura/);
  assert.deepEqual(validateConsentDraft({ ...draft, receivedOn: '2026-11-10' }, new Date('2026-11-10T05:00:00Z')), {});
  assert.deepEqual(validateConsentDraft(draft, now), {});
});
test('CA-03: file presence and exact size boundary, without reading document content', () => {
  assert.match(validateConsentDraft({ ...draft, file: undefined }, now).file, /Selecciona/);
  assert.match(validateConsentDraft({ ...draft, file: { size: 0 } }, now).file, /vacío/);
  assert.deepEqual(validateConsentDraft({ ...draft, file: { size: 10485760 } }, now), {});
  assert.match(validateConsentDraft({ ...draft, file: { size: 10485761 } }, now).file, /10 MiB/);
});
test('CA-04: server errors name their field; unknown reasons have a safe fallback', () => {
  assert.equal(consentFieldMessage('receivedOn', 'required'), 'Indica la fecha de recepción.');
  assert.match(consentFieldMessage('signedOn', 'future_date'), /^Fecha de firma:/);
  assert.match(consentFieldMessage('metadata', 'unknown'), /No pudimos validar/);
});
