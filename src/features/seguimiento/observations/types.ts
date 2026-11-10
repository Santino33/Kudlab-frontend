import { isUuid } from '../../academico/students/types.ts';

export const behaviors = { ATTENTION: 'Atención', FOLLOWING_INSTRUCTIONS: 'Seguimiento de instrucciones' } as const;
export const descriptions = { ATTENTION: 'Mantiene la atención en la actividad que está realizando.', FOLLOWING_INSTRUCTIONS: 'Realiza los pasos de la instrucción dada.' };
export const frequencies = { NEVER: 'Nunca', SOMETIMES: 'A veces', ALMOST_ALWAYS: 'Casi siempre', ALWAYS: 'Siempre' } as const;
export const areas = { LANGUAGE_READING: 'Lenguaje/Lectura', MATHEMATICS: 'Matemáticas' } as const;
export type Values = { behavior: keyof typeof behaviors; frequency: keyof typeof frequencies; area: keyof typeof areas | null; observedOn: string; schoolYear: number; term: number };
export type Input = Values & { requestId: string; groupId?: string; expectedVersion?: number };
export type Revision = Values & { id: string; version: number; actorId: string; recordedAt: string };
export type Identity = { id: string; studentId: string; author: { id: string; name: string }; createdAt: string; version: number };
export type Observation = Identity & { revision: Revision };
export type Receipt = { requestId: string; studentId: string; observationId: string; fingerprint: string; revision: Revision };
export type Page<T> = { items: T[]; nextCursor: string | null };
export type Filters = { schoolYear?: number; term?: number; behavior?: Values['behavior']; area?: keyof typeof areas | 'UNSPECIFIED'; observedFrom?: string; observedTo?: string };
export type Field = keyof Input | 'observation' | 'cursor' | 'limit' | 'observedFrom' | 'observedTo';
export type FormValues = { behavior: string; frequency: string; area: string; observedOn: string; schoolYear: string; term: string };
export const emptyForm = (): FormValues => ({ behavior: '', frequency: '', area: '', observedOn: '', schoolYear: '', term: '' });
export const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
export const integer = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= -2147483648 && v <= 2147483647;
export const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && !v.startsWith('0000-') && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const instant = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT.*Z$/.test(v) && Number.isFinite(Date.parse(v));
const member = (v: unknown, set: object) => typeof v === 'string' && Object.hasOwn(set, v);
export function parseValues(v: unknown): Values | undefined {
  if (!object(v) || !member(v.behavior, behaviors) || !member(v.frequency, frequencies) || !(v.area === null || member(v.area, areas)) || !date(v.observedOn) || !integer(v.schoolYear) || !integer(v.term) || v.term < 1 || v.term > 4) return;
  return { behavior: v.behavior as Values['behavior'], frequency: v.frequency as Values['frequency'], area: v.area as Values['area'], observedOn: v.observedOn, schoolYear: v.schoolYear, term: v.term };
}
export function parseRevision(v: unknown): Revision | undefined {
  const values = parseValues(v);
  if (!values || !object(v) || !isUuid(v.id) || !isUuid(v.actorId) || !integer(v.version) || v.version < 1 || !instant(v.recordedAt)) return;
  return { ...values, id: v.id, actorId: v.actorId, version: v.version, recordedAt: v.recordedAt };
}
export function parseIdentity(v: unknown, studentId: string): Identity | undefined {
  if (!object(v) || !isUuid(v.id) || v.studentId !== studentId || !object(v.author) || !isUuid(v.author.id) || typeof v.author.name !== 'string' || !v.author.name.trim() || !instant(v.createdAt) || !integer(v.version) || v.version < 1) return;
  return { id: v.id, studentId, author: { id: v.author.id, name: v.author.name }, createdAt: v.createdAt, version: v.version };
}
export function parseObservation(v: unknown, studentId: string): Observation | undefined {
  const identity = parseIdentity(v, studentId), revision = object(v) ? parseRevision(v.revision) : undefined;
  if (!identity || !revision || identity.version !== revision.version || Date.parse(revision.recordedAt) < Date.parse(identity.createdAt) || revision.actorId !== identity.author.id) return;
  return { ...identity, revision };
}
export function parsePage<T>(v: unknown, parse: (v: unknown) => T | undefined): Page<T> | undefined {
  if (!object(v) || !Array.isArray(v.items) || v.items.length > 100 || !(v.nextCursor === null || typeof v.nextCursor === 'string' && /^[\w-]{1,2048}$/.test(v.nextCursor))) return;
  const items = v.items.map(parse); if (items.some(item => item === undefined)) return;
  return { items: items as T[], nextCursor: v.nextCursor };
}
export function parseReceipt(v: unknown): Receipt | undefined {
  if (!object(v) || !isUuid(v.requestId) || !isUuid(v.studentId) || !isUuid(v.observationId) || typeof v.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(v.fingerprint)) return;
  const revision = parseRevision(v.revision); if (!revision) return;
  return { requestId: v.requestId, studentId: v.studentId, observationId: v.observationId, fingerprint: v.fingerprint, revision };
}
export const messages: Record<string, string> = {
  required: 'Completa este campo.', invalid_format: 'Revisa el formato del campo.', not_allowed: 'Selecciona una opción válida.', future_date: 'La fecha observada no puede ser futura en Colombia.',
  STUDENT_INACTIVE: 'El estudiante está inactivo. Se conserva la consulta del historial.', CONSENT_REQUIRED: 'Se requiere consentimiento vigente para guardar. El historial sigue disponible.',
  AUTHOR_REQUIRED: 'Solo el autor original, aún responsable, puede corregir.', CORRECTION_CLOSED: 'Se cumplieron las 24 horas desde el registro original. Ya no puede corregirse.',
  STALE_VERSION: 'Otra corrección cambió la versión. Consulta el valor vigente y decide expresamente una nueva corrección.', REQUEST_MISMATCH: 'Este intento corresponde a otro contenido. Comprueba su recibo antes de continuar.',
};
export function decodeFields(v: unknown): { field: Field; reason: string }[] {
  if (!object(v) || typeof v.message !== 'string' || !['INVALID_INPUT', 'CONFLICT', 'NOT_FOUND', 'UNAVAILABLE', 'UNAUTHENTICATED', 'FORBIDDEN'].includes(String(v.code))) throw new Error('Invalid error envelope');
  if (v.fields === undefined && v.code !== 'CONFLICT') return [];
  if (!Array.isArray(v.fields) || !v.fields.length || v.code === 'CONFLICT' && v.fields.length !== 1) throw new Error('Invalid fields');
  return v.fields.map(item => {
    if (!object(item) || Object.keys(item).some(k => !['field', 'reason'].includes(k)) || typeof item.field !== 'string' || typeof item.reason !== 'string') throw new Error('Invalid issue');
    const { field, reason } = item;
    const allowed = v.code === 'CONFLICT' ? field === 'observation' && ['STUDENT_INACTIVE', 'CONSENT_REQUIRED', 'AUTHOR_REQUIRED', 'CORRECTION_CLOSED', 'STALE_VERSION', 'REQUEST_MISMATCH'].includes(reason) : v.code === 'INVALID_INPUT' && (
      reason === 'required' && ['behavior', 'frequency', 'observedOn', 'schoolYear', 'term', 'requestId', 'expectedVersion'].includes(field) ||
      reason === 'invalid_format' && ['observedOn', 'schoolYear', 'requestId', 'expectedVersion', 'groupId', 'cursor'].includes(field) ||
      reason === 'not_allowed' && ['behavior', 'frequency', 'term', 'area', 'observation'].includes(field) || reason === 'future_date' && field === 'observedOn');
    if (!allowed) throw new Error('Undocumented issue');
    return { field: field as Field, reason };
  });
}
export function today(at = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}
export function formIssues(v: FormValues, at = new Date(), contextOnly = false): Partial<Record<Field, string>> {
  const result: Partial<Record<Field, string>> = {};
  if (!member(v.behavior, behaviors)) result.behavior = 'Selecciona una conducta.';
  if (!date(v.observedOn)) result.observedOn = 'Indica una fecha válida.';
  else if (v.observedOn > today(at)) result.observedOn = messages.future_date;
  if (!/^-?\d+$/.test(v.schoolYear) || !integer(Number(v.schoolYear))) result.schoolYear = 'Indica un año lectivo entero.';
  if (!/^[1-4]$/.test(v.term)) result.term = 'Selecciona un periodo del 1 al 4.';
  if (v.area && !member(v.area, areas)) result.area = 'Selecciona un área válida.';
  if (!contextOnly && v.frequency && v.frequency !== 'UNOBSERVED' && !member(v.frequency, frequencies)) result.frequency = 'Selecciona una frecuencia válida.';
  return result;
}
export const valued = (frequency: string) => member(frequency, frequencies);
export function formInput(v: FormValues): Values {
  return { behavior: v.behavior as Values['behavior'], frequency: v.frequency as Values['frequency'], area: (v.area || null) as Values['area'], observedOn: v.observedOn, schoolYear: Number(v.schoolYear), term: Number(v.term) };
}
export function toForm(v: Values): FormValues { return { ...v, area: v.area ?? '', schoolYear: String(v.schoolYear), term: String(v.term) }; }
