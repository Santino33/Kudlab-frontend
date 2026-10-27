import { isUuid } from '../students/types.ts';

export type Group = { id: string; name: string; grade: string; schoolYear: number; teacherId: string; teacherName: string };
export type Teacher = { id: string; name: string };
export type GroupInput = Pick<Group, 'name' | 'grade' | 'schoolYear' | 'teacherId'>;
export const groupFields = ['name', 'grade', 'schoolYear', 'teacherId'] as const;
export type GroupField = typeof groupFields[number];
export const groupLabels: Record<GroupField, string> = { name: 'Nombre del curso', grade: 'Grado', schoolYear: 'Año escolar', teacherId: 'Profesor responsable' };
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value === value.trim() && [...value].length > 0 && [...value].length <= max && !value.includes('\0');
export function parseGroup(value: unknown): Group | undefined {
  if (!value || typeof value !== 'object') return;
  const row = value as Record<string, unknown>;
  if (!isUuid(row.id) || !isUuid(row.teacherId) || !text(row.name, 50) || !text(row.grade, 20) || !text(row.teacherName, 200) ||
    typeof row.schoolYear !== 'number' || !Number.isInteger(row.schoolYear) || row.schoolYear < -2147483648 || row.schoolYear > 2147483647) return;
  return { id: row.id, name: row.name, grade: row.grade, schoolYear: row.schoolYear, teacherId: row.teacherId, teacherName: row.teacherName };
}
export function parseGroups(data: unknown): { items: Group[] } | undefined {
  if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items)) return;
  const items: Group[] = [];
  for (const row of data.items) { const item = parseGroup(row); if (!item || items.some(other => other.id === item.id)) return; items.push(item); }
  return { items };
}
export function parseTeachers(data: unknown): { items: Teacher[] } | undefined {
  if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items)) return;
  const items: Teacher[] = [];
  for (const row of data.items) {
    if (!row || typeof row !== 'object' || !isUuid(row.id) || !text(row.name, 200) || items.some(other => other.id === row.id)) return;
    items.push({ id: row.id, name: row.name });
  }
  return { items };
}
export function groupIssues(input: GroupInput): Partial<Record<GroupField, string>> {
  return {
    ...(!text(input.name.trim(), 50) ? { name: 'Escribe entre 1 y 50 caracteres.' } : {}),
    ...(!text(input.grade.trim(), 20) ? { grade: 'Escribe entre 1 y 20 caracteres.' } : {}),
    ...(!Number.isInteger(input.schoolYear) || input.schoolYear < -2147483648 || input.schoolYear > 2147483647 ? { schoolYear: 'Escribe un año entero válido.' } : {}),
    ...(!isUuid(input.teacherId) ? { teacherId: 'Selecciona un profesor habilitado.' } : {}),
  };
}
export function decodeGroupFields(data: unknown): { field: GroupField; reason: string }[] {
  if (!data || typeof data !== 'object' || !('fields' in data) || !data.fields || typeof data.fields !== 'object') return [];
  const fields = data.fields as Record<string, unknown>;
  return groupFields.flatMap(field => ['required', 'invalid_format', 'too_long'].includes(String(fields[field])) ? [{ field, reason: field === 'teacherId' ? 'Selecciona un profesor habilitado.' : 'Revisa el formato y la longitud de este campo.' }] : []);
}
