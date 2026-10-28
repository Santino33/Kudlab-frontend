import type { HttpClient } from '../../../lib/http.ts';
import { decodeStudentFields, isUuid, parseStudent, parseStudents, studentFields } from './types.ts';
import type { Student, StudentField, StudentInput } from './types.ts';
import type { HttpResult } from '../../usuarios/types.ts';

export type StudentWrite = { id?: string; groupId?: string; phase: 'pending' | 'uncertain' };
export function createStudentsApi(http: HttpClient, onWrite: (state: StudentWrite | undefined) => void = () => {}, groupId?: string) {
  const path = '/api/v1/students';
  async function write(id: string | undefined, request: () => Promise<HttpResult<Student, StudentField>>) {
    onWrite({ id, ...(groupId ? { groupId } : {}), phase: 'pending' });
    const result = await request();
    onWrite(result.kind === 'obsolete' || ('uncertain' in result && result.uncertain) ? { id, ...(groupId ? { groupId } : {}), phase: 'uncertain' } : undefined);
    return result;
  }
  const missing = () => Promise.resolve({ kind: 'error' as const, status: 404, code: 'NOT_FOUND' as const, uncertain: false });
  return {
    list(signal: AbortSignal) {
      if (groupId !== undefined && !isUuid(groupId)) return missing();
      return http.request<{ items: Student[] }, StudentField>(groupId ? `/api/v1/groups/${groupId}/students` : path, { signal, decodeFields: decodeStudentFields, decode: (data, status) => {
        const list = status === 200 ? parseStudents(data) : undefined;
        return list && (!groupId || list.items.every(student => student.groupId === groupId)) ? list : undefined;
      } });
    },
    async detail(id: string, signal: AbortSignal) {
      if (!isUuid(id)) return missing();
      const result = await http.request<Student, StudentField>(`${path}/${id}`, { signal, decodeFields: decodeStudentFields, decode: (data, status) => {
        const student = status === 200 ? parseStudent(data) : undefined;
        return student?.id === id ? student : undefined;
      } });
      return result.kind === 'success' && groupId && result.data.groupId !== groupId ? missing() : result;
    },
    create(input: StudentInput & { groupId: string }, signal: AbortSignal) {
      if (groupId && input.groupId !== groupId) return missing();
      const body = { groupId: input.groupId, ...Object.fromEntries(studentFields.map((field) => [field, input[field].trim()])) };
      return write(undefined, () => http.request<Student, StudentField>(path, { method: 'POST', body, signal, decodeFields: decodeStudentFields, decode: (data, status) => {
        const student = status === 201 ? parseStudent(data) : undefined;
        return student && student.groupId === input.groupId && studentFields.every((field) => student[field] === body[field as keyof typeof body]) ? student : undefined;
      } }));
    },
    update(before: Student, changes: Partial<StudentInput>, signal: AbortSignal) {
      if (groupId && before.groupId !== groupId) return missing();
      const body = Object.fromEntries(studentFields.filter((field) => changes[field] !== undefined).map((field) => [field, changes[field]!.trim()]));
      if (!Object.keys(body).length) return Promise.resolve({ kind: 'error' as const, status: 400, code: 'INVALID_INPUT' as const, uncertain: false });
      return write(before.id, () => http.request<Student, StudentField>(`${path}/${before.id}`, { method: 'PATCH', body, signal, decodeFields: decodeStudentFields, decode: (data, status) => {
        const student = status === 200 ? parseStudent(data) : undefined;
        return student?.id === before.id && student.groupId === before.groupId && student.isActive === before.isActive && studentFields.every((field) => student[field] === (body[field] ?? before[field])) ? student : undefined;
      } }));
    },
    deactivate(before: Student, signal: AbortSignal) {
      if (groupId && before.groupId !== groupId) return missing();
      return write(before.id, () => http.request<Student, StudentField>(`${path}/${before.id}/deactivate`, { method: 'POST', bodyAbsent: true, signal, decodeFields: decodeStudentFields, decode: (data, status) => {
        const student = status === 200 ? parseStudent(data) : undefined;
        return student?.id === before.id && student.groupId === before.groupId && !student.isActive && studentFields.every((field) => student[field] === before[field]) ? student : undefined;
      } }));
    },
  };
}
export type StudentsApi = ReturnType<typeof createStudentsApi>;
