import { isUuid, parseStudent } from '../students/types.ts';
import type { Student } from '../students/types.ts';

export type ConsentRecord = { id: string; signedOn: string; receivedOn: string; mediaType: string; byteSize: number; sha256: string };
export type ConsentSnapshot = { student: Student; consent: { state: 'NONE' | 'CURRENT' | 'REVOKED'; version: number; currentRecord: ConsentRecord | null }; evaluatedAt: string };
export type ConsentAck = { requestId: string; eventId: string; recordId: string; version: number; confirmedAt: string; repeated: boolean };
export type ConsentEvent = { id: string; type: 'REGISTER' | 'REPLACE' | 'REVOKE'; version: number; record: ConsentRecord; previousRecordId: string | null;
  author: { id: string; name: string }; occurredAt: string; reason: string | null };
export type ConsentHistory = { items: ConsentEvent[]; nextCursor: string | null };
export type ConsentMetadata = { requestId: string; expectedVersion: number; signedOn: string; receivedOn: string };
export type ConsentRevocation = { requestId: string; expectedVersion: number; recordId: string; reason: string };
export type ConsentOperation = { requestId: string; action: 'REGISTER' | 'REVOKE'; status: 'PENDING' | 'COMMITTED' | 'REJECTED'; acknowledgement: ConsentAck | null;
  attempt: { expectedVersion: number; signedOn: string | null; receivedOn: string | null; mediaType: string | null; byteSize: number | null; sha256: string | null }; rejectionCode: string | null };
export type ConsentDraft = { signedOn: string; receivedOn: string; file?: File; baseVersion?: number; reviewRequired?: boolean;
  revocation?: Omit<ConsentRevocation, 'requestId'>; operation?: ConsentMetadata | ConsentRevocation;
  phase?: 'sending' | 'uncertain' | 'retry'; focus?: string };
export type ConsentField = 'file' | 'signedOn' | 'receivedOn' | 'metadata' | 'requestId' | 'expectedVersion' | 'operation' | 'reason' | 'recordId';
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const instant = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const mime = (v: unknown): v is string => typeof v === 'string' && ['application/pdf', 'image/png', 'image/jpeg'].includes(v);
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export function parseRecord(v: unknown): ConsentRecord | undefined {
  if (!object(v) || !isUuid(v.id) || !date(v.signedOn) || !date(v.receivedOn) || v.signedOn > v.receivedOn || !mime(v.mediaType) ||
    !integer(v.byteSize) || v.byteSize < 1 || v.byteSize > 10485760 || !hash(v.sha256)) return;
  return { id: v.id, signedOn: v.signedOn, receivedOn: v.receivedOn, mediaType: v.mediaType, byteSize: v.byteSize, sha256: v.sha256 };
}
export function parseSnapshot(v: unknown): ConsentSnapshot | undefined {
  if (!object(v) || !object(v.consent) || !instant(v.evaluatedAt)) return;
  const student = parseStudent(v.student), c = v.consent, record = parseRecord(c.currentRecord);
  if (!student || !integer(c.version)) return;
  if (c.state === 'NONE' && c.version === 0 && c.currentRecord === null)
    return { student, consent: { state: 'NONE', version: 0, currentRecord: null }, evaluatedAt: v.evaluatedAt };
  if ((c.state === 'CURRENT' || c.state === 'REVOKED') && c.version > 0 && record)
    return { student, consent: { state: c.state, version: c.version, currentRecord: record }, evaluatedAt: v.evaluatedAt };
}
export function parseAck(v: unknown): ConsentAck | undefined {
  if (!object(v) || !isUuid(v.requestId) || !isUuid(v.eventId) || !isUuid(v.recordId) || !integer(v.version) || !v.version || !instant(v.confirmedAt) || typeof v.repeated !== 'boolean') return;
  return { requestId: v.requestId, eventId: v.eventId, recordId: v.recordId, version: v.version, confirmedAt: v.confirmedAt, repeated: v.repeated };
}
export function parseHistory(v: unknown): ConsentHistory | undefined {
  if (!object(v) || !Array.isArray(v.items) || v.items.length > 25 || !(v.nextCursor === null || typeof v.nextCursor === 'string' && /^[\w-]{1,512}$/.test(v.nextCursor))) return;
  const items: ConsentEvent[] = [];
  for (const item of v.items) {
    if (!object(item) || !isUuid(item.id) || !['REGISTER', 'REPLACE', 'REVOKE'].includes(String(item.type)) || !integer(item.version) || !item.version ||
      !object(item.author) || !isUuid(item.author.id) || typeof item.author.name !== 'string' || !item.author.name.trim() || item.author.name.length > 200 || !instant(item.occurredAt) ||
      !(item.previousRecordId === null || isUuid(item.previousRecordId)) || !(item.reason === null || typeof item.reason === 'string' && item.reason.length <= 2000)) return;
    const record = parseRecord(item.record);
    if (!record || items.length && items.at(-1)!.version <= item.version || item.type === 'REVOKE' && (typeof item.reason !== 'string' || !item.reason.trim())) return;
    items.push({ id: item.id, type: item.type as ConsentEvent['type'], version: item.version, record, previousRecordId: item.previousRecordId,
      author: { id: item.author.id, name: item.author.name }, occurredAt: item.occurredAt, reason: item.reason });
  }
  return { items, nextCursor: v.nextCursor };
}
export function parseOperation(v: unknown): ConsentOperation | undefined {
  if (!object(v) || !isUuid(v.requestId) || !object(v.attempt) || !integer(v.attempt.expectedVersion)) return;
  const a = v.attempt, acknowledgement = parseAck(v.acknowledgement);
  if (v.action === 'REGISTER') {
    if (!date(a.signedOn) || !date(a.receivedOn) || !mime(a.mediaType) || !integer(a.byteSize) || a.byteSize < 1 || a.byteSize > 10485760 || !hash(a.sha256)) return;
  } else if (v.action !== 'REVOKE' || v.status !== 'COMMITTED' || [a.signedOn, a.receivedOn, a.mediaType, a.byteSize, a.sha256].some(value => value !== null)) return;
  if (!(v.status === 'COMMITTED' && acknowledgement?.requestId === v.requestId && v.rejectionCode === null ||
    v.status === 'PENDING' && v.acknowledgement === null && v.rejectionCode === null || v.status === 'REJECTED' && v.acknowledgement === null && v.rejectionCode === 'STALE_VERSION')) return;
  return { requestId: v.requestId, action: v.action, status: v.status as ConsentOperation['status'], acknowledgement: acknowledgement ?? null,
    attempt: { expectedVersion: a.expectedVersion as number, signedOn: a.signedOn as string | null, receivedOn: a.receivedOn as string | null,
      mediaType: a.mediaType as string | null, byteSize: a.byteSize as number | null, sha256: a.sha256 as string | null }, rejectionCode: v.rejectionCode as string | null };
}
export const fieldMessages: Record<string, string> = {
  required: 'Completa este campo.', invalid_format: 'Revisa el formato y los límites indicados.', too_large: 'El archivo supera los 10 MiB.',
  future_date: 'La fecha no puede ser futura en Colombia.', date_order: 'La firma debe ser anterior o igual a la recepción.',
  STALE_VERSION: 'El consentimiento cambió. Consulta el estado actual antes de preparar otro registro.', REQUEST_REUSED: 'Este identificador corresponde a otro contenido. Comprueba la operación original.',
  NOT_CURRENT: 'El registro ya no es el vigente.', EVIDENCE_MISMATCH: 'No se pudo comprobar que el documento coincida con el intento original.',
};
export function decodeConsentFields(v: unknown): { field: ConsentField; reason: string }[] {
  if (!object(v) || !Array.isArray(v.fields)) return [];
  return v.fields.flatMap(item => {
    if (!object(item) || typeof item.field !== 'string' || typeof item.reason !== 'string') return [];
    const conflict = item.field === 'operation' && v.code === 'CONFLICT' && ['STALE_VERSION', 'REQUEST_REUSED', 'NOT_CURRENT', 'EVIDENCE_MISMATCH'].includes(item.reason);
    const input = v.code === 'INVALID_INPUT' && ['file', 'signedOn', 'receivedOn', 'metadata', 'requestId', 'expectedVersion', 'reason', 'recordId'].includes(item.field) && ['required', 'invalid_format', 'too_large', 'future_date', 'date_order'].includes(item.reason);
    return conflict || input ? [{ field: item.field as ConsentField, reason: item.reason }] : [];
  });
}
