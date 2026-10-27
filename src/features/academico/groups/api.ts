import type { HttpClient } from '../../../lib/http.ts';
import { isUuid } from '../students/types.ts';
import type { HttpResult } from '../../usuarios/types.ts';
import { decodeGroupFields, groupFields, parseGroup, parseGroups, parseTeachers } from './types.ts';
import type { Group, GroupField, GroupInput } from './types.ts';
export type GroupWrite = { id?: string; phase: 'pending' | 'uncertain' };
export function createGroupsApi(http: HttpClient, onWrite: (state: GroupWrite | undefined) => void = () => {}) {
  const base = '/api/v1/groups';
  const missing = () => Promise.resolve({ kind: 'error' as const, status: 404, code: 'NOT_FOUND' as const, uncertain: false });
  async function write<T>(id: string | undefined, request: () => Promise<HttpResult<T, GroupField>>) {
    onWrite({ id, phase: 'pending' });
    const result = await request();
    onWrite(result.kind === 'obsolete' || ('uncertain' in result && result.uncertain) ? { id, phase: 'uncertain' } : undefined);
    return result;
  }
  return {
    list(signal: AbortSignal) { return http.request(base, { signal, decode: (data, status) => status === 200 ? parseGroups(data) : undefined }); },
    teachers(signal: AbortSignal) { return http.request(`${base}/teachers`, { signal, decode: (data, status) => status === 200 ? parseTeachers(data) : undefined }); },
    detail(id: string, signal: AbortSignal) {
      if (!isUuid(id)) return missing();
      return http.request(`${base}/${id}`, { signal, decode: (data, status) => { const row = status === 200 ? parseGroup(data) : undefined; return row?.id === id ? row : undefined; } });
    },
    save(input: GroupInput, signal: AbortSignal, before?: Group, confirmTransfer = false) {
      if (before && !isUuid(before.id)) return missing();
      const normalized = { name: input.name.trim(), grade: input.grade.trim(), schoolYear: input.schoolYear, teacherId: input.teacherId };
      const body = before ? Object.fromEntries(groupFields.filter(field => normalized[field] !== before[field]).map(field => [field, normalized[field]])) : normalized;
      if (before && !Object.keys(body).length) return Promise.resolve({ kind: 'error' as const, status: 400, code: 'INVALID_INPUT' as const, uncertain: false });
      return write(before?.id, () => http.request<Group, GroupField>(before ? `${base}/${before.id}` : base, { method: before ? 'PATCH' : 'POST', body: { ...body, ...(confirmTransfer && before && input.teacherId !== before.teacherId ? { confirmTransfer: true } : {}) }, signal, decodeFields: decodeGroupFields,
        decode: (data, status) => {
          const row = status === (before ? 200 : 201) ? parseGroup(data) : undefined;
          return row && (!before || row.id === before.id) && groupFields.every(field => row[field] === normalized[field]) ? row : undefined;
        } }));
    },
    delete(id: string, signal: AbortSignal) {
      if (!isUuid(id)) return missing();
      return write(id, () => http.request<{ id: string; deleted: true }, GroupField>(`${base}/${id}`, { method: 'DELETE', bodyAbsent: true, signal,
        decode: (data, status) => status === 200 && data !== null && typeof data === 'object' && 'id' in data && data.id === id && 'deleted' in data && data.deleted === true ? { id, deleted: true } : undefined }));
    },
  };
}
export type GroupsApi = ReturnType<typeof createGroupsApi>;
