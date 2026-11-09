import { isUuid } from '../students/types.ts';
type Handle = { actorId: string; studentId: string; requestId: string };
const key = 'kudlab.consent-operation';
export function operationHandle(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  return {
    read(actorId: string, studentId: string): Handle | undefined {
      try {
        const value = JSON.parse(storage.getItem(key) ?? 'null');
        if (value && Object.keys(value).sort().join() === 'actorId,requestId,studentId' && value.actorId === actorId && value.studentId === studentId && isUuid(value.requestId)) return value;
        storage.removeItem(key);
      } catch { /* Storage can be unavailable; never fall back to persisting a draft. */ }
    },
    write(value: Handle) { try { storage.setItem(key, JSON.stringify({ actorId: value.actorId, studentId: value.studentId, requestId: value.requestId })); } catch { /* In-memory recovery remains available. */ } },
    clear() { try { storage.removeItem(key); } catch { /* No alternative persistence. */ } },
  };
}
