import type { HttpClient } from '../../lib/http.ts';
import type { HttpResult } from '../usuarios/types.ts';
import { isId } from '../tareas/activities/types.ts';
import { metricCodes, parseDefinitions, parseHistoryPage, scopes, type HistoryPage, type IndicatorDefinition, type MetricCode, type Scope } from './types.ts';

export type HistoryFilter = { metricCode?: MetricCode; scope?: Scope; from?: string; to?: string };
const invalid: HttpResult<never> = { kind: 'error', status: 400, code: 'INVALID_INPUT', uncertain: false };
const notFound: HttpResult<never> = { kind: 'error', status: 404, code: 'NOT_FOUND', uncertain: false };

export function isRealDay(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}
// Valida antes de pedir: un rango inválido no genera consulta (CA-04).
export function filterError(filter: HistoryFilter): 'range' | 'date' | 'metric' | 'scope' | undefined {
  if (filter.metricCode !== undefined && !(metricCodes as readonly string[]).includes(filter.metricCode)) return 'metric';
  if (filter.scope !== undefined && !(scopes as readonly string[]).includes(filter.scope)) return 'scope';
  if (filter.from !== undefined && !isRealDay(filter.from) || filter.to !== undefined && !isRealDay(filter.to)) return 'date';
  if (filter.from !== undefined && filter.to !== undefined && filter.from > filter.to) return 'range';
}

export function createIndicatorsApi(http: HttpClient) {
  return {
    definitions: (signal: AbortSignal): Promise<HttpResult<IndicatorDefinition[]>> =>
      http.request('/api/v1/indicator-definitions', { signal, decode: parseDefinitions }),
    history(studentId: string, filter: HistoryFilter, signal: AbortSignal, cursor?: string): Promise<HttpResult<HistoryPage>> {
      if (!isId(studentId)) return Promise.resolve(notFound);
      if (filterError(filter)) return Promise.resolve(invalid);
      const query = new URLSearchParams({ taskId: 'TG-01', limit: '25' });
      for (const k of ['metricCode', 'scope', 'from', 'to'] as const) if (filter[k] !== undefined) query.set(k, filter[k]);
      if (cursor) query.set('cursor', cursor);
      return http.request(`/api/v1/students/${encodeURIComponent(studentId)}/indicator-history?${query}`, { signal, decode: v => parseHistoryPage(v, studentId) });
    },
  };
}
export type IndicatorsApi = ReturnType<typeof createIndicatorsApi>;
