import type { HttpClient } from '../../lib/http.ts';
import { parseTaskDetail, parseTaskPage } from './types.ts';

export function createTasksApi(http: HttpClient) {
  return {
    list(signal: AbortSignal) {
      return http.request('/api/v1/tasks', { signal, decode: (data, status) => status === 200 ? parseTaskPage(data) : undefined });
    },
    detail(id: string, signal: AbortSignal) {
      if (!/^TG-[0-9]{2}$/.test(id)) return Promise.resolve({ kind: 'error' as const, status: 400, code: 'INVALID_INPUT' as const, uncertain: false });
      return http.request(`/api/v1/tasks/${encodeURIComponent(id)}`, { signal, decode: (data, status) => {
        const task = status === 200 ? parseTaskDetail(data) : undefined;
        return task?.id === id ? task : undefined;
      } });
    },
  };
}
export type TasksApi = ReturnType<typeof createTasksApi>;
