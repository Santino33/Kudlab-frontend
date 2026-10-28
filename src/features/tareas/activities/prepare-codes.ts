import type { ActivitiesApi } from './api.ts';
import type { Assignment, CodeMetadata } from './types.ts';
import type { HttpResult } from '../../usuarios/types.ts';

export async function prepareCodes(api: ActivitiesApi, assignment: Assignment, requestId: (batch: number) => string, signal: AbortSignal,
  progress: { nextBatch?: number; confirmed?(items: CodeMetadata[], nextBatch: number): void } = {}): Promise<HttpResult<Assignment>> {
  for (let offset = (progress.nextBatch ?? 0) * 100; offset < assignment.recipients.length; offset += 100) {
    if (signal.aborted) return { kind: 'unavailable', uncertain: true };
    const abort = new AbortController(), cancel = () => abort.abort();
    signal.addEventListener('abort', cancel, { once: true });
    // Each batch gets its own deadline; a large assignment is not one 15-second mutation.
    const timer = setTimeout(cancel, 15000);
    try {
      const result = await api.generateCodes(assignment.id, requestId(offset / 100), assignment.recipients.slice(offset, offset + 100).map(r => r.id), abort.signal);
      if (abort.signal.aborted) return { kind: 'unavailable', uncertain: true };
      if (result.kind !== 'success') return result;
      progress.confirmed?.(result.data.items, offset / 100 + 1);
    } catch { return { kind: 'unavailable', uncertain: true }; }
    finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
  }
  return { kind: 'success', data: assignment };
}
