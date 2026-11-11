export type Annotation = { id: string; studentId: string; text: string; author: { id: string; name: string };
  createdAt: string; updatedAt: string | null; canEdit: boolean; canDelete: boolean };
export type AnnotationsList = { studentId: string; isActive: boolean; canCreate: boolean; items: Annotation[]; nextCursor: string | null };
export type AnnotationDeleted = { id: string; studentId: string; deleted: true };
export type AnnotationField = 'text' | 'operation';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string[]) =>
  Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
export const annotationId = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const instant = (value: unknown): value is string => typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export const annotationMessages = {
  required: 'Escribe una anotación; no puede estar vacía ni contener solo espacios.',
  tooLong: 'La anotación admite hasta 1.000 caracteres. El texto no se ha recortado.',
  inactive: 'El estudiante está inactivo: las anotaciones solo se pueden consultar.',
  notAuthor: 'Solo el autor con acceso vigente puede editar o borrar esta anotación.',
};
export function annotationTextIssue(text: string): string | undefined {
  if (!text.trim()) return annotationMessages.required;
  if ([...text].length > 1000) return annotationMessages.tooLong;
  if (text.includes('\0') || /[\uD800-\uDFFF]/u.test(text)) return 'El texto contiene un carácter no válido.';
}

export function parseAnnotation(value: unknown): Annotation | undefined {
  if (!object(value) || !keys(value, ['id', 'studentId', 'text', 'author', 'createdAt', 'updatedAt', 'canEdit', 'canDelete']) ||
    !annotationId(value.id) || !annotationId(value.studentId) || typeof value.text !== 'string' || annotationTextIssue(value.text) ||
    !object(value.author) || !keys(value.author, ['id', 'name']) || !annotationId(value.author.id) || typeof value.author.name !== 'string' ||
    !instant(value.createdAt) || value.updatedAt !== null && !instant(value.updatedAt) ||
    typeof value.canEdit !== 'boolean' || typeof value.canDelete !== 'boolean' || value.canEdit !== value.canDelete) return;
  if (value.updatedAt !== null && value.updatedAt < value.createdAt) return;
  return value as Annotation;
}

export function parseAnnotationsList(value: unknown): AnnotationsList | undefined {
  if (!object(value) || !keys(value, ['studentId', 'isActive', 'canCreate', 'items', 'nextCursor']) || !annotationId(value.studentId) ||
    typeof value.isActive !== 'boolean' || typeof value.canCreate !== 'boolean' || value.canCreate !== value.isActive ||
    !Array.isArray(value.items) || value.items.length > 100 ||
    value.nextCursor !== null && (typeof value.nextCursor !== 'string' || !/^[\w-]{1,512}$/.test(value.nextCursor))) return;
  const items = value.items.map(parseAnnotation);
  if (items.some(item => !item || item.studentId !== value.studentId || !value.isActive && (item.canEdit || item.canDelete)) ||
    new Set(items.map(item => item?.id)).size !== items.length || value.nextCursor !== null && !items.length) return;
  return { studentId: value.studentId, isActive: value.isActive, canCreate: value.canCreate, items: items as Annotation[], nextCursor: value.nextCursor as string | null };
}

export function parseAnnotationDeleted(value: unknown): AnnotationDeleted | undefined {
  if (!object(value) || !keys(value, ['id', 'studentId', 'deleted']) || !annotationId(value.id) || !annotationId(value.studentId) || value.deleted !== true) return;
  return value as AnnotationDeleted;
}

export function decodeAnnotationFields(value: unknown): { field: AnnotationField; reason: string }[] {
  if (!object(value) || !Array.isArray(value.fields)) return [];
  const messages: Record<string, string> = value.code === 'INVALID_INPUT' ? {
    'text:TEXT_REQUIRED': annotationMessages.required, 'text:TEXT_TOO_LONG': annotationMessages.tooLong,
  } : value.code === 'CONFLICT' ? {
    'operation:STUDENT_INACTIVE': annotationMessages.inactive, 'operation:NOT_AUTHOR': annotationMessages.notAuthor,
  } : {};
  return value.fields.flatMap(item => {
    if (!object(item) || !keys(item, ['field', 'reason']) || typeof item.field !== 'string' || typeof item.reason !== 'string') return [];
    const key = `${item.field}:${item.reason}`;
    return Object.hasOwn(messages, key) ? [{ field: item.field as AnnotationField, reason: messages[key]! }] : [];
  });
}
