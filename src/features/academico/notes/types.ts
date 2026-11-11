// Notas académicas por área y periodo (features/notas-academicas.md). Reglas de validación idénticas a las del servidor.
export const subjects = ['LENGUAJE', 'MATEMATICAS'] as const;
export type Subject = typeof subjects[number];
export const subjectLabels: Record<Subject, string> = { LENGUAJE: 'Lenguaje/Lectura', MATEMATICAS: 'Matemáticas' };
export const terms = [1, 2, 3, 4] as const;
export type Term = typeof terms[number];

export type NoteRevision = { version: number; score: string; authorName: string; recordedAt: string };
export type Note = { id: string; subject: Subject; term: Term; score: string; version: number; authorName: string; updatedAt: string; revisions: NoteRevision[] };
export type NotesList = { schoolYear: number; items: Note[] };
export type NoteDraftInput = { subject?: Subject; term?: Term; scoreText: string };

export type NoteField = 'subject' | 'term' | 'score' | 'note' | 'student' | 'version';
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

// Escala 1.0–5.0 con un decimal y punto (D-02): idéntica a la expresión del servidor.
const SCORE_INPUT = /^(?:[1-4](?:\.[0-9])?|5(?:\.0)?)$/;
const SCORE_STORED = /^(?:[1-4]\.[0-9]|5\.0)$/;
export const isStoredScore = (value: unknown): value is string => typeof value === 'string' && SCORE_STORED.test(value);
export const isSubject = (value: unknown): value is Subject => subjects.includes(value as Subject);
export const isTerm = (value: unknown): value is Term => terms.includes(value as Term);
export const normalizeScore = (text: string) => (text.includes('.') ? text : `${text}.0`);

const issueText: Record<string, string> = {
  'subject:required': 'Selecciona un área.',
  'subject:invalid_format': 'Selecciona un área de la lista.',
  'term:required': 'Selecciona un periodo.',
  'term:invalid_format': 'Selecciona un periodo de la lista.',
  'term:out_of_range': 'Selecciona un periodo del 1 al 4.',
  'score:required': 'Ingresa la nota.',
  'score:invalid_format': 'Escribe la nota con punto decimal, por ejemplo 4.5.',
  'score:out_of_range': 'La nota debe estar entre 1.0 y 5.0.',
  'score:too_many_decimals': 'Usa un solo decimal, por ejemplo 4.5.',
  'version:required': 'No se pudo identificar la versión de la nota. Actualiza la lista.',
  'version:invalid_format': 'No se pudo identificar la versión de la nota. Actualiza la lista.',
};

export function scoreIssue(text: string): string | undefined {
  const value = text.trim();
  if (!value) return issueText['score:required'];
  if (SCORE_INPUT.test(value)) return undefined;
  if (/^[0-9]+\.[0-9]{2,}$/.test(value)) return issueText['score:too_many_decimals'];
  if (/^[0-9]+(?:\.[0-9])?$/.test(value)) return issueText['score:out_of_range'];
  return issueText['score:invalid_format'];
}

export function noteIssues(input: NoteDraftInput): Partial<Record<'subject' | 'term' | 'score', string>> {
  const issues: Partial<Record<'subject' | 'term' | 'score', string>> = {};
  if (!input.subject) issues.subject = issueText['subject:required'];
  if (!input.term) issues.term = issueText['term:required'];
  const score = scoreIssue(input.scoreText);
  if (score) issues.score = score;
  return issues;
}

function parseRevision(value: unknown): NoteRevision | undefined {
  if (!object(value) || !hasKeys(value, ['version', 'score', 'authorName', 'recordedAt'])) return;
  if (!Number.isInteger(value.version) || (value.version as number) < 1 || !isStoredScore(value.score) ||
    typeof value.authorName !== 'string' || typeof value.recordedAt !== 'string' || Number.isNaN(Date.parse(value.recordedAt))) return;
  return { version: value.version as number, score: value.score, authorName: value.authorName, recordedAt: value.recordedAt };
}

export function parseNote(value: unknown): Note | undefined {
  if (!object(value) || !hasKeys(value, ['id', 'subject', 'term', 'score', 'version', 'authorName', 'updatedAt', 'revisions'])) return;
  if (!isUuid(value.id) || !isSubject(value.subject) || !isTerm(value.term) || !isStoredScore(value.score) ||
    !Number.isInteger(value.version) || (value.version as number) < 1 || typeof value.authorName !== 'string' ||
    typeof value.updatedAt !== 'string' || Number.isNaN(Date.parse(value.updatedAt)) || !Array.isArray(value.revisions) || !value.revisions.length) return;
  const revisions = value.revisions.map(parseRevision);
  if (revisions.some((revision) => !revision)) return;
  const list = revisions as NoteRevision[];
  // Cambios ordenados y consistentes con la nota vigente.
  if (list.some((revision, index) => index > 0 && revision.version <= list[index - 1]!.version)) return;
  const last = list[list.length - 1]!;
  if (last.version !== value.version || last.score !== value.score) return;
  return { id: value.id, subject: value.subject, term: value.term, score: value.score, version: value.version as number,
    authorName: value.authorName, updatedAt: value.updatedAt, revisions: list };
}

export function parseNotesList(value: unknown): NotesList | undefined {
  if (!object(value) || !hasKeys(value, ['schoolYear', 'items']) || !Number.isInteger(value.schoolYear) || !Array.isArray(value.items)) return;
  const items = value.items.map(parseNote);
  if (items.some((item) => !item)) return;
  const list = items as Note[];
  if (new Set(list.map((item) => item.id)).size !== list.length ||
    new Set(list.map((item) => `${item.subject}:${item.term}`)).size !== list.length) return;
  return { schoolYear: value.schoolYear as number, items: list };
}

// Decodificador cerrado: solo combinaciones código + campo + razón documentadas; mensajes fijos, nunca texto del servidor.
const conflicts: Record<string, string> = {
  'note:already_exists': 'Ya existe una nota para esta área y periodo. Usa «Actualizar».',
  'student:inactive': 'El estudiante está inactivo: las notas solo se pueden consultar.',
  'version:stale': 'La nota cambió mientras la editabas. Revisa el valor vigente antes de decidir.',
};
export type NoteFieldIssue = { field: NoteField; reason: string; key: string };
export function decodeNoteFields(data: unknown): { field: NoteField; reason: string }[] {
  if (!object(data) || !Array.isArray(data.fields) || (data.code !== 'INVALID_INPUT' && data.code !== 'CONFLICT')) return [];
  const table = data.code === 'CONFLICT' ? conflicts : issueText;
  return data.fields.flatMap((item): { field: NoteField; reason: string }[] => {
    if (!object(item) || !hasKeys(item, ['field', 'reason']) || typeof item.field !== 'string' || typeof item.reason !== 'string') return [];
    const key = `${item.field}:${item.reason}`;
    return Object.hasOwn(table, key) ? [{ field: item.field as NoteField, reason: table[key]! }] : [];
  });
}
export const conflictKeys = { exists: conflicts['note:already_exists']!, inactive: conflicts['student:inactive']!, stale: conflicts['version:stale']! };
