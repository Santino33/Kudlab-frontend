import type { ObservationsApi } from './api.ts';
import { object } from './types.ts';
import type { Field, Input, Receipt } from './types.ts';
import { isUuid } from '../../academico/students/types.ts';

export type Reference = { requestId: string; studentId: string; groupId?: string; observationId?: string; kind: 'CREATE' | 'CORRECT'; fingerprint: string };
export type Attempt = { reference: Reference; body?: Input; phase: 'uncertain' | 'confirmed' | 'rejected'; receipt?: Receipt; reason?: string; issues?: { field: Field; reason: string }[] };
export type ReferenceStore = ReturnType<typeof referenceStore>;
export async function fingerprint(studentId: string, input: Input, observationId?: string) {
  const text = JSON.stringify([observationId ? 'CORRECT' : 'CREATE', studentId.toLowerCase(), observationId?.toLowerCase() ?? null,
    input.expectedVersion ?? null, input.groupId?.toLowerCase() ?? null, input.behavior, input.frequency, input.area ?? null, input.observedOn, input.schoolYear, input.term]);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
}
function parseReference(v: unknown): Reference | undefined {
  if (!object(v) || !isUuid(v.requestId) || !isUuid(v.studentId) || !(v.groupId === undefined || isUuid(v.groupId)) ||
    !(v.kind === 'CREATE' && v.observationId === undefined || v.kind === 'CORRECT' && isUuid(v.observationId)) ||
    typeof v.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(v.fingerprint)) return;
  return { requestId: v.requestId, studentId: v.studentId, kind: v.kind, fingerprint: v.fingerprint,
    ...(v.groupId ? { groupId: v.groupId } : {}), ...(v.observationId ? { observationId: v.observationId as string } : {}) };
}
export function referenceStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, origin: string, actorId: string) {
  const key = `kudlab.observations:${encodeURIComponent(new URL(origin).origin)}:${encodeURIComponent(actorId)}`;
  function read(): Reference[] {
    const text = storage.getItem(key); if (text === null) return [];
    const raw: unknown = JSON.parse(text);
    if (!Array.isArray(raw)) throw new Error('Invalid references');
    const result = raw.map(parseReference);
    if (result.some(r => !r) || new Set(result.map(r => r!.requestId)).size !== result.length) throw new Error('Invalid references');
    return result as Reference[];
  }
  return {
    read,
    purge() { storage.removeItem(key); },
    put(reference: Reference) {
      const safe = parseReference(reference); if (!safe) throw new Error('Invalid reference');
      const previous = read(), found = previous.find(r => r.requestId === safe.requestId);
      if (found && JSON.stringify(found) !== JSON.stringify(safe)) throw new Error('Intent mismatch');
      storage.setItem(key, JSON.stringify([...previous.filter(r => r.requestId !== safe.requestId), safe]));
    },
    remove(requestId: string) { const next = read().filter(r => r.requestId !== requestId); if (next.length) storage.setItem(key, JSON.stringify(next)); else storage.removeItem(key); },
  };
}
// Only one live capture owns this session; pending phases are uncertain before any HTTP/abort.
export function createWriteSession({ api, store, initial = [], valid, changed, lost }: {
  api: ObservationsApi; store: ReferenceStore; initial?: Attempt[]; valid(): boolean; changed(attempts: Attempt[]): void; lost(): void;
}) {
  let attempts = initial, disposed = false;
  const busy = new Set<string>(), requests = new Set<AbortController>();
  const current = () => !disposed && valid();
  const publish = () => { if (current()) changed([...attempts]); };
  function update(attempt: Attempt) { attempts = [...attempts.filter(a => a.reference.requestId !== attempt.reference.requestId), attempt]; publish(); }
  function clearReference(id: string) { try { store.remove(id); } catch { /* A surviving reference is reconciled as a receipt, never replayed. */ } }
  function restore(matches: (reference: Reference) => boolean) {
    for (const reference of store.read().filter(matches)) if (!attempts.some(a => a.reference.requestId === reference.requestId)) attempts = [...attempts, { reference, phase: 'uncertain' }];
    publish();
  }
  async function send(studentId: string, body: Input, observationId?: string, previous?: Reference, deliberateNew = false) {
    if (!current() || busy.has(studentId)) return 'blocked';
    busy.add(studentId);
    try {
      const hash = await fingerprint(studentId, body, observationId);
      if (!current()) return 'blocked';
      if (previous && (previous.studentId !== studentId || previous.observationId !== observationId || previous.fingerprint !== hash || previous.requestId !== body.requestId)) return 'mismatch';
      if (!previous && !deliberateNew && attempts.some(a => a.reference.studentId === studentId && a.phase === 'uncertain')) return 'blocked';
      const reference: Reference = previous ?? { requestId: body.requestId, studentId, kind: observationId ? 'CORRECT' : 'CREATE', fingerprint: hash,
        ...(body.groupId ? { groupId: body.groupId } : {}), ...(observationId ? { observationId } : {}) };
      try { store.put(reference); } catch { return 'storage'; }
      const attempt: Attempt = { reference, body: { ...body }, phase: 'uncertain' }; update(attempt);
      const request = new AbortController(); requests.add(request);
      const result = await api.write(studentId, body, hash, request.signal, observationId); requests.delete(request);
      if (!current()) return 'blocked';
      if (result.kind === 'success') { clearReference(reference.requestId); update({ ...attempt, phase: 'confirmed', receipt: result.data }); return 'confirmed'; }
      if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { lost(); return 'blocked'; }
      if (result.kind === 'error' && !result.uncertain && result.status < 500 && result.fields?.[0]?.reason !== 'REQUEST_MISMATCH') {
        clearReference(reference.requestId); update({ ...attempt, phase: 'rejected', reason: result.fields?.map(f => f.reason).join(',') ?? 'INVALID_INPUT', issues: result.fields }); return 'rejected';
      }
      publish(); return 'uncertain';
    } finally { busy.delete(studentId); }
  }
  async function reconcile(attempt: Attempt) {
    const ref = attempt.reference;
    if (!current() || busy.has(ref.studentId) || attempt.phase !== 'uncertain') return;
    busy.add(ref.studentId); const request = new AbortController(); requests.add(request);
    try {
      const result = await api.receipt(ref.studentId, ref.requestId, ref.fingerprint, request.signal, ref.observationId);
      if (!current()) return;
      if (result.kind === 'success' && result.data.receipt) { clearReference(ref.requestId); update({ ...attempt, phase: 'confirmed', receipt: result.data.receipt }); }
      else if (result.kind === 'error' && [401, 403, 404].includes(result.status)) lost();
      // Null and failed reads leave exactly the same uncertain reference and never send a write.
    } finally { requests.delete(request); busy.delete(ref.studentId); }
  }
  return { restore, send, reconcile, read: () => current() ? attempts : [], busy: () => busy.size > 0,
    dispose() { disposed = true; for (const request of requests) request.abort(); requests.clear(); } };
}
