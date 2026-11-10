import { useEffect, useRef, useState } from 'react';
import type { DraftSlot, DraftLease } from '../../academico/students/student-drafts.ts';
import type { ObservationsApi } from './api.ts';
import { createWriteSession, referenceStore } from './recovery.ts';
import type { Attempt, Reference } from './recovery.ts';
import { useLeaveGuard } from './use-leave-guard';

export type CaptureLifecycle = Pick<NonNullable<DraftLease>, 'valid' | 'onStop' | 'discard'>;
export function useCapture<T extends { attempts: Attempt[]; focus?: string }>({ api, apiOrigin, actorId, draft, lease, initial, matches, lost, dirty }: {
  api: ObservationsApi; apiOrigin: string; actorId: string; draft: DraftSlot<T>; lease: CaptureLifecycle; initial(): T; matches(reference: Reference): boolean; lost(): void; dirty(value: T): boolean;
}) {
  const [value, setValue] = useState<T>(() => draft.read() ?? initial());
  const ref = useRef(value), alive = useRef(false), current = useRef({ draft, lease, matches, lost }); current.current = { draft, lease, matches, lost };
  const runtime = useRef<ReturnType<typeof createWriteSession> | undefined>(undefined);
  const [busy, setBusy] = useState(false), [storageError, setStorageError] = useState('');
  const leaving = useLeaveGuard(lease, () => Boolean(runtime.current?.busy()) || dirty(ref.current) || ref.current.attempts.some(a => a.phase === 'uncertain'));
  function update(next: T) {
    if (!alive.current || !current.current.lease.valid()) return;
    ref.current = next; current.current.draft.write(next); setValue(next);
  }
  useEffect(() => {
    alive.current = true;
    try {
      const store = referenceStore(sessionStorage, apiOrigin, actorId);
      const engine = createWriteSession({ api, store, initial: ref.current.attempts, valid: () => alive.current && current.current.lease.valid(),
        changed: attempts => update({ ...ref.current, attempts }), lost: () => current.current.lost() });
      runtime.current = engine; engine.restore(r => current.current.matches(r));
      const stop = () => { alive.current = false; engine.dispose(); };
      const remove = lease.onStop(stop);
      if (ref.current.focus) document.getElementById(ref.current.focus)?.focus();
      return () => { remove(); stop(); };
    } catch {
      setStorageError('No podemos conservar las referencias de recuperación en esta pestaña. No se iniciarán envíos; habilita el almacenamiento de sesión y vuelve a abrir la captura.');
      return () => { alive.current = false; runtime.current?.dispose(); };
    }
  }, [api, apiOrigin, actorId, lease]);
  async function run<R>(action: (engine: NonNullable<typeof runtime.current>) => Promise<R>) {
    if (busy || !runtime.current || !lease.valid() || runtime.current.busy() || storageError) return;
    setBusy(true);
    try { return await action(runtime.current); }
    finally { if (alive.current && current.current.lease.valid()) setBusy(false); }
  }
  return { value, ref, update, busy, storageError, run, navigationAvailable: leaving.available, leaveDialog: leaving.dialog, valid: () => alive.current && current.current.lease.valid() };
}
