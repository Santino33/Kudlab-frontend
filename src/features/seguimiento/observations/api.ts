import type { AuthController } from '../../../auth/controller.ts';
import { createHttpClient } from '../../../lib/http.ts';
import type { HttpResult } from '../../usuarios/types.ts';
import { decodeFields, object, parseIdentity, parseObservation, parsePage, parseReceipt, parseRevision } from './types.ts';
import type { Field, Filters, Input, Receipt } from './types.ts';

export function observationAccess(access: Pick<AuthController, 'getGeneration' | 'notify'>) {
  return { getGeneration: () => access.getGeneration(), notify: (event: Parameters<AuthController['notify']>[0]) => { if (event.category !== 'unavailable') access.notify(event); } };
}
export function createObservationsApi(origin: string, access: Pick<AuthController, 'getGeneration' | 'notify'>, fetcher: typeof fetch = globalThis.fetch) {
  const http = createHttpClient(origin, observationAccess(access), fetcher);
  const base = (id: string) => `/api/v1/students/${encodeURIComponent(id)}/observations`;
  async function run<T>(signal: AbortSignal, write: boolean, call: (signal: AbortSignal) => Promise<HttpResult<T, Field>>): Promise<HttpResult<T, Field>> {
    const abort = new AbortController(), cancel = () => abort.abort();
    signal.addEventListener('abort', cancel, { once: true }); if (signal.aborted) cancel();
    const timer = setTimeout(cancel, 15000);
    try {
      const result = await call(abort.signal);
      if (result.kind !== 'error') return result;
      const codes: Record<number, string> = { 400: 'INVALID_INPUT', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 503: 'UNAVAILABLE' };
      if (codes[result.status] !== result.code || result.status === 409 && !result.fields?.length) return { kind: 'unavailable', uncertain: write };
      return { ...result, uncertain: write && (result.uncertain || result.status === 404) };
    } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
  }
  return {
    generation: () => access.getGeneration(),
    history(id: string, filters: Filters, cursor: string | null, signal: AbortSignal) {
      const query = new URLSearchParams(Object.entries({ ...filters, ...(cursor ? { cursor } : {}) }).map(([k, v]) => [k, String(v)]));
      return run(signal, false, s => http.request(`${base(id)}?${query}`, { signal: s, decodeFields, decode: (v, status) => {
        const page = status === 200 ? parsePage(v, item => parseObservation(item, id)) : undefined;
        if (!page || new Set(page.items.map(i => i.id)).size !== page.items.length || page.items.some((item, n) => n && (item.createdAt > page.items[n - 1]!.createdAt || item.createdAt === page.items[n - 1]!.createdAt && item.id >= page.items[n - 1]!.id))) return;
        return page;
      } }));
    },
    revisions(id: string, observationId: string, cursor: string | null, signal: AbortSignal) {
      return run(signal, false, s => http.request(`${base(id)}/${encodeURIComponent(observationId)}/revisions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { signal: s, decodeFields, decode: (v, status) => {
        if (status !== 200 || !object(v)) return;
        const observation = parseIdentity(v.observation, id), page = parsePage(v, parseRevision);
        if (!observation || observation.id !== observationId || !page || page.items.some((item, n) => item.actorId !== observation.author.id || item.version > observation.version || n && item.version <= page.items[n - 1]!.version)) return;
        return { observation, ...page };
      } }));
    },
    write(id: string, input: Input, fingerprint: string, signal: AbortSignal, observationId?: string) {
      return run(signal, true, s => http.request(`${base(id)}${observationId ? `/${encodeURIComponent(observationId)}/revisions` : ''}`, { method: 'POST', body: input, signal: s, decodeFields, decode: (v, status) => {
        if (![200, 201].includes(status) || !object(v) || v.repeated !== (status === 200)) return;
        const receipt = parseReceipt(v.receipt);
        if (!receipt || !matches(receipt, id, input.requestId, fingerprint, observationId) || receipt.revision.version !== (observationId ? input.expectedVersion! + 1 : 1) ||
          (['behavior', 'frequency', 'area', 'observedOn', 'schoolYear', 'term'] as const).some(k => receipt.revision[k] !== input[k])) return;
        return receipt;
      } }));
    },
    receipt(id: string, requestId: string, fingerprint: string, signal: AbortSignal, observationId?: string) {
      return run(signal, false, s => http.request(`/api/v1/students/${encodeURIComponent(id)}/observation-requests/${encodeURIComponent(requestId)}`, { signal: s, decodeFields, decode: (v, status) => {
        if (status !== 200 || !object(v)) return;
        if (v.receipt === null) return { receipt: null };
        const receipt = parseReceipt(v.receipt);
        return receipt && matches(receipt, id, requestId, fingerprint, observationId) ? { receipt } : undefined;
      } }));
    },
  };
}
function matches(receipt: Receipt, studentId: string, requestId: string, fingerprint: string, observationId?: string) {
  return receipt.studentId === studentId && receipt.requestId === requestId && receipt.fingerprint === fingerprint && (!observationId || receipt.observationId === observationId);
}
export type ObservationsApi = ReturnType<typeof createObservationsApi>;
