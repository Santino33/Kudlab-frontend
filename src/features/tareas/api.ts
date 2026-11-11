import type { HttpClient } from '../../lib/http.ts';
import { isTaskId, parseTask, parseTaskDetail, parseTaskPage } from './types.ts';

export function createTasksApi(http: HttpClient) {
  return {
    setAvailability(id: string, isEnabled: boolean, expectedRevision: number, signal: AbortSignal) {
      if (!isTaskId(id) || typeof isEnabled !== 'boolean' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
        return Promise.resolve({ kind: 'error' as const, status: 400, code: 'INVALID_INPUT' as const, uncertain: false });
      return http.request(`/api/v1/tasks/${encodeURIComponent(id)}/availability`, {
        method: 'PATCH', body: { isEnabled, expectedRevision }, signal,
        decode: (data, status) => { const task = status === 200 ? parseTask(data) : undefined; return task?.id === id ? task : undefined; },
      });
    },
    list(signal: AbortSignal) {
      return http.request('/api/v1/tasks', { signal, decode: (data, status) => status === 200 ? parseTaskPage(data) : undefined });
    },
    detail(id: string, signal: AbortSignal) {
      if (!isTaskId(id)) return Promise.resolve({ kind: 'error' as const, status: 400, code: 'INVALID_INPUT' as const, uncertain: false });
      return http.request(`/api/v1/tasks/${encodeURIComponent(id)}`, { signal, decode: (data, status) => {
        const task = status === 200 ? parseTaskDetail(data) : undefined;
        return task?.id === id ? task : undefined;
      } });
    },
  };
}
export type TasksApi = ReturnType<typeof createTasksApi>;
