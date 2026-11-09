import type { AuthController } from '../../../auth/controller.ts';
import { createHttpClient } from '../../../lib/http.ts';
import type { HttpResult } from '../../usuarios/types.ts';
import { decodeConsentFields, parseAck, parseHistory, parseOperation, parseSnapshot } from './types.ts';
import type { ConsentField, ConsentMetadata } from './types.ts';

export function consentAccess(access: Pick<AuthController, 'getGeneration' | 'notify'>) {
  return { getGeneration: () => access.getGeneration(), notify: (event: Parameters<AuthController['notify']>[0]) => {
    if (event.category !== 'unavailable') access.notify(event);
  } };
}
export function createConsentsApi(origin: string, access: Pick<AuthController, 'getGeneration' | 'notify'>, fetcher: typeof fetch = globalThis.fetch) {
  const http = createHttpClient(origin, consentAccess(access), fetcher);
  const path = (id: string) => `/api/v1/students/${id}/consents`;
  async function run<T>(signal: AbortSignal, milliseconds: number, call: (signal: AbortSignal) => Promise<HttpResult<T, ConsentField>>) {
    const controller = new AbortController(), abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(abort, milliseconds);
    try {
      const result = await call(controller.signal);
      if (result.kind !== 'error') return result;
      const codes: Record<number, string> = { 400: 'INVALID_INPUT', 413: 'INVALID_INPUT', 415: 'INVALID_INPUT', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 503: 'UNAVAILABLE' };
      if (codes[result.status] !== result.code) return { kind: 'unavailable' as const, uncertain: result.uncertain };
      return result;
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
  }
  return {
    generation: () => access.getGeneration(),
    snapshot: (id: string, signal: AbortSignal) => run(signal, 15000, s => http.request(path(id), { signal: s, decodeFields: decodeConsentFields,
      decode: (v, status) => { const result = status === 200 ? parseSnapshot(v) : undefined; return result?.student.id === id ? result : undefined; } })),
    register: (id: string, metadata: ConsentMetadata, file: File, signal: AbortSignal) => {
      const formData = new FormData(); formData.append('file', file); formData.append('metadata', JSON.stringify(metadata));
      return run(signal, 120000, s => http.request(path(id), { method: 'POST', formData, signal: s, decodeFields: decodeConsentFields,
        decode: (v, status) => {
          if ((status !== 200 && status !== 201) || !v || typeof v !== 'object' || !('acknowledgement' in v) || !('snapshot' in v)) return;
          const acknowledgement = parseAck(v.acknowledgement), snapshot = parseSnapshot(v.snapshot);
          if (acknowledgement?.requestId === metadata.requestId && snapshot?.student.id === id && acknowledgement.repeated === (status === 200)) return { acknowledgement, snapshot };
        } }));
    },
    history: (id: string, cursor: string | null, signal: AbortSignal) => run(signal, 15000, s => http.request(`${path(id)}/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      { signal: s, decodeFields: decodeConsentFields, decode: (v, status) => status === 200 ? parseHistory(v) : undefined })),
    operation: (id: string, requestId: string, signal: AbortSignal) => run(signal, 15000, s => http.request(`${path(id)}/operations/${requestId}`, { signal: s, decodeFields: decodeConsentFields,
      decode: (v, status) => { const result = status === 200 ? parseOperation(v) : undefined; return result?.requestId === requestId ? result : undefined; } })),
    document: (id: string, recordId: string, signal: AbortSignal) => run(signal, 15000, s => http.request(`${path(id)}/${recordId}/document`, {
      signal: s, responseType: 'blob', decodeFields: decodeConsentFields, decode: (v, status) => status === 200 && v instanceof Blob ? v : undefined,
    })),
  };
}
export type ConsentsApi = ReturnType<typeof createConsentsApi>;
