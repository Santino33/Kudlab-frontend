export type Student = { id: string; groupId: string; studentCode: string; firstName: string; lastName: string; isActive: boolean };
export const studentFields = ['studentCode', 'firstName', 'lastName'] as const;
export type StudentField = typeof studentFields[number] | 'groupId';
export type StudentInput = Pick<Student, typeof studentFields[number]>;
export const fieldLabels = { groupId: 'Grupo', studentCode: 'Código', firstName: 'Nombres', lastName: 'Apellidos' };
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function validStudentText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && !value.includes('\0') && Array.from(value).length <= limit;
}
export function parseStudent(value: unknown): Student | undefined {
  if (!object(value) || Object.keys(value).length !== 6 || !isUuid(value.id) || !isUuid(value.groupId) ||
    !validStudentText(value.studentCode, 50) || !validStudentText(value.firstName, 100) ||
    !validStudentText(value.lastName, 100) || typeof value.isActive !== 'boolean') return;
  return { id: value.id, groupId: value.groupId, studentCode: value.studentCode, firstName: value.firstName, lastName: value.lastName, isActive: value.isActive };
}
export function parseStudents(value: unknown): { items: Student[] } | undefined {
  if (!object(value) || !Array.isArray(value.items)) return;
  const items = value.items.map(parseStudent);
  if (items.some((item) => !item) || new Set(items.map((item) => item!.id)).size !== items.length) return;
  return { items: items as Student[] };
}
export function studentIssues(input: StudentInput): Partial<Record<StudentField, string>> {
  return Object.fromEntries(studentFields.flatMap((field) => {
    const limit = field === 'studentCode' ? 50 : 100;
    return validStudentText(input[field].trim(), limit) ? [] : [[field, `Ingresa ${fieldLabels[field].toLowerCase()} de entre 1 y ${limit} caracteres, sin caracteres NUL.`]];
  }));
}
export function studentChanges(before: StudentInput, input: StudentInput): Partial<StudentInput> {
  return Object.fromEntries(studentFields.filter((field) => input[field].trim() !== before[field]).map((field) => [field, input[field].trim()]));
}
export function decodeStudentFields(data: unknown): { field: StudentField; reason: string }[] {
  if (!object(data) || !object(data.fields)) return [];
  const fields = data.fields;
  const reasons: Record<string, string> = { required: 'Completa este campo.', invalid_type: 'Ingresa un texto válido.', invalid_format: 'Revisa el formato de este campo.', too_long: 'El texto supera el límite permitido.' };
  return (['groupId', ...studentFields] as const).flatMap((field) => {
    const reason = fields[field];
    return typeof reason === 'string' && Object.hasOwn(reasons, reason) ? [{ field, reason: reasons[reason] }] : [];
  });
}
