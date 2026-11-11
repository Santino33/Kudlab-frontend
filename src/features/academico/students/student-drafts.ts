import type { AuthController } from '../../../auth/controller.ts';
import type { ConsentDraft } from '../consents/types.ts';
import type { ObservationDraft } from '../../seguimiento/observations/StudentObservations.tsx';
import type { MatrixDraft } from '../../seguimiento/observations/matrix.ts';
import type { AnnotationDraft } from '../../seguimiento/annotations/draft.ts';

export type StudentRefresh = { revision: number; status: 'ready' | 'checking' | 'unavailable' };
export type ConsentChange = { studentId: string; requestId: string; outcome: 'confirmed' | 'uncertain' };
export type DraftSlot<T> = { read(): T | undefined; write(value: T | undefined): void };
export type DraftSelection = { apiOrigin: string; actorId: string; role: 'TEACHER'; groupId: string } &
  ({ kind: 'student'; studentId: string; entryGroupId?: string } | { kind: 'observationMatrix' });
// Future producers supply their own payload types; no business state is imported ahead of their delivery.
export interface StudentDraftSlots { consent: ConsentDraft; observations: ObservationDraft; notes: unknown; annotations: AnnotationDraft; observationMatrix: MatrixDraft }
export type DraftLease = ReturnType<ReturnType<typeof createStudentDraftHost>['confirm']>;
export function createStudentDraftHost(access: Pick<AuthController, 'getSnapshot' | 'getGeneration'>) {
  let selection: DraftSelection | undefined, generation = -1, epoch = 0, sealed = true;
  let values: Partial<StudentDraftSlots> = {};
  const cleanups = new Set<() => void>();
  const same = (a: DraftSelection, b: DraftSelection) => a.apiOrigin === b.apiOrigin && a.actorId === b.actorId && a.role === b.role &&
    a.groupId === b.groupId && a.kind === b.kind && (a.kind !== 'student' || b.kind === 'student' && a.studentId === b.studentId && a.entryGroupId === b.entryGroupId);
  function stop() { for (const cleanup of cleanups) cleanup(); cleanups.clear(); }
  function discard() { sealed = true; epoch++; stop(); values = {}; selection = undefined; }
  function suspend() {
    if (values.consent?.phase === 'sending') values.consent = { ...values.consent, phase: 'uncertain' };
    sealed = true; epoch++; stop();
  }
  function sync() {
    const state = access.getSnapshot();
    if (state.kind === 'signedOut' || state.kind === 'signingIn' || state.kind === 'signingOut' || state.kind === 'signOutUnconfirmed' ||
      (state.kind === 'checking' || state.kind === 'checkUnavailable') && ['denied', 'signIn', 'signOut'].includes(state.context) ||
      state.kind === 'authenticated' && (state.denied || state.user.role !== 'TEACHER' || selection && state.user.id !== selection.actorId)) discard();
    else if (state.kind !== 'authenticated' || generation !== state.generation) { if (!sealed) suspend(); }
  }
  function confirm(key: DraftSelection, capturedGeneration: number, capturedEpoch: number) {
    sync();
    const state = access.getSnapshot();
    if (capturedEpoch !== epoch || capturedGeneration !== state.generation || state.kind !== 'authenticated' || state.denied || state.user.id !== key.actorId || state.user.role !== 'TEACHER' ||
      key.kind === 'student' && key.entryGroupId !== undefined && key.entryGroupId !== key.groupId) return;
    if (selection && !same(selection, key)) discard();
    selection = key; generation = capturedGeneration; sealed = false;
    const token = epoch;
    const valid = () => { sync(); return !sealed && epoch === token && generation === capturedGeneration && Boolean(selection && same(selection, key)); };
    return {
      valid,
      slot<K extends keyof StudentDraftSlots>(name: K): DraftSlot<StudentDraftSlots[K]> {
        return { read: () => valid() ? values[name] : undefined,
          write: value => { if (valid()) { if (value === undefined) delete values[name]; else values[name] = value; } } };
      },
      onStop(cleanup: () => void) { if (!valid()) { cleanup(); return () => {}; } cleanups.add(cleanup); return () => { cleanups.delete(cleanup); }; },
      discard() { if (valid()) discard(); },
    };
  }
  return { confirm, suspend, discard, sync, capture: () => { sync(); return { generation: access.getGeneration(), epoch }; } };
}
export type StudentDraftHost = ReturnType<typeof createStudentDraftHost>;
