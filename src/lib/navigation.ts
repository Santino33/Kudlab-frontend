import type { MouseEvent } from 'react';

type Entry = { key: string; url: string; sameDocument: boolean };
type NativeNavigation = { currentEntry: Entry | null; entries(): Entry[]; traverseTo(key: string): { committed: Promise<unknown>; finished: Promise<unknown> } };
type NavigationHost = Pick<Window, 'history' | 'location' | 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> & { navigation?: NativeNavigation };
export type LeaveGuard = { dirty(): boolean; valid(): boolean; decide(): Promise<boolean>; cancel(): void; discard(): void; unavailable(): void };

// One coordinator and one capture, not a second router or a cache of private drafts.
let active: ReturnType<typeof createNavigationCoordinator> | undefined;
export function createNavigationCoordinator(host: NavigationHost, commit: () => void, sameSelection: (from: URL, to: URL) => boolean) {
  const native = host.navigation;
  const current = () => ({ key: native?.currentEntry?.key ?? '', url: host.location.href });
  let confirmed = current(), guard: LeaveGuard | undefined, sequence = 0, failed = false;
  let pending: { token: number; source: ReturnType<typeof current>; target: ReturnType<typeof current>; guard: LeaveGuard; phase: 'restoring' | 'deciding' | 'replaying'; cancelled: boolean; move: number } | undefined;
  function accessible(key: string) {
    try { return Boolean(key && native?.entries().some(e => e.key === key && e.sameDocument)); } catch { return false; }
  }
  function supported() { return !failed && typeof native?.traverseTo === 'function' && accessible(confirmed.key) && accessible(current().key); }
  function fail() {
    failed = true; sequence++; pending = undefined; guard?.cancel(); guard?.unavailable();
    // No push/replace repair, replay, or draft/reference deletion after an uncertain traversal.
  }
  function publish() { confirmed = current(); commit(); }
  function blocks(href: string) { return guard?.valid() && guard.dirty() && !sameSelection(new URL(confirmed.url), new URL(href)); }
  async function traverse(key: string, token: number) {
    if (!accessible(key) || !native) { if (sequence === token) fail(); return false; }
    try {
      const result = native.traverseTo(key);
      // Observe both immediately: either promise can reject independently.
      const settled = await Promise.allSettled([result.committed, result.finished]);
      if (settled.some(r => r.status === 'rejected')) { if (sequence === token) fail(); return false; }
      return true;
    } catch { if (sequence === token) fail(); return false; }
  }
  function invalidate() {
    sequence++; guard?.cancel();
    if (pending) {
      pending.cancelled = true;
      if (pending.phase === 'deciding') pending = undefined;
    }
  }
  function cancelled(op: NonNullable<typeof pending>) {
    if (pending !== op) return;
    if (current().key === op.source.key) pending = undefined;
    else { op.token = sequence; restore(op); }
  }
  function restore(op: NonNullable<typeof pending>) {
    op.phase = 'restoring'; const move = ++op.move;
    void traverse(op.source.key, op.token).then(ok => {
      if (pending !== op || op.move !== move) return;
      if (!ok) { fail(); return; }
      if (current().key !== op.source.key) { fail(); return; }
      if (op.cancelled) cancelled(op);
      else if (sequence === op.token) void decide(op);
    });
  }
  async function decide(op: NonNullable<typeof pending>) {
    op.phase = 'deciding';
    const accepted = await op.guard.decide().catch(() => false);
    if (pending !== op || sequence !== op.token || op.cancelled || guard !== op.guard || !op.guard.valid()) return;
    if (!accepted) { pending = undefined; return; }
    if (!accessible(op.source.key) || !accessible(op.target.key) || current().key !== op.source.key) { fail(); return; }
    op.phase = 'replaying';
    const ok = await traverse(op.target.key, op.token);
    if (pending !== op) return;
    if (!ok) { fail(); return; }
    if (op.cancelled) { cancelled(op); return; }
    if (sequence !== op.token || guard !== op.guard || !op.guard.valid()) return;
    if (current().key !== op.target.key) { fail(); return; }
    pending = undefined; sequence++; op.guard.discard(); publish();
  }
  const popped = () => {
    const destination = current();
    if (pending) {
      const op = pending;
      if (destination.key === op.source.key) {
        return;
      }
      if (op.cancelled) { op.token = sequence; restore(op); return; }
      if (op.phase === 'replaying' && destination.key === op.target.key) {
        if (!op.guard.valid() || guard !== op.guard) invalidate();
        return; // Commit only after both native promises finish successfully.
      }
      // Reentrant traversal replaces the target; a stale dialog/promise cannot replay it.
      sequence++; op.guard.cancel();
    } else if (destination.key && destination.key === confirmed.key) return;
    if (!blocks(destination.url)) { pending = undefined; publish(); return; }
    if (!supported() || !guard) { fail(); return; }
    const op = { token: ++sequence, source: confirmed, target: destination, guard, phase: 'restoring' as const, cancelled: false, move: 0 };
    pending = op; restore(op);
  };
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (guard?.valid() && guard.dirty()) { event.preventDefault(); event.returnValue = ''; }
  };
  host.addEventListener('popstate', popped);
  host.addEventListener('beforeunload', beforeUnload as EventListener);
  return {
    supported,
    invalidate,
    register(next: LeaveGuard) {
      invalidate(); const registered = { ...next }; guard = registered;
      if (!supported()) registered.unavailable();
      return () => { if (guard === registered) { invalidate(); guard = undefined; } };
    },
    async request(href: string, state: unknown = null) {
      const target = new URL(href, host.location.href);
      if (target.origin !== host.location.origin || target.hash) return false;
      invalidate(); const token = sequence, captured = guard;
      // A preceding native attempt must be restored before an imperative push can be considered.
      if (confirmed.key && current().key !== confirmed.key && !await traverse(confirmed.key, token)) return false;
      if (token !== sequence) return false;
      if (blocks(target.href) && captured) {
        const accepted = await captured.decide().catch(() => false);
        if (!accepted || token !== sequence || guard !== captured || !captured.valid()) return false;
        if (current().key !== confirmed.key) return false;
        captured.discard();
      }
      if (target.href !== host.location.href) host.history.pushState(state, '', target.href);
      publish(); host.dispatchEvent(new PopStateEvent('popstate')); return true;
    },
    replace(href: string, state: unknown = host.history.state) {
      const target = new URL(href, host.location.href);
      if (pending || target.origin !== host.location.origin || target.pathname !== host.location.pathname || target.hash) return false;
      host.history.replaceState(state, '', target.href); confirmed = current(); return true;
    },
    dispose() { invalidate(); pending = undefined; guard = undefined; host.removeEventListener('popstate', popped); host.removeEventListener('beforeunload', beforeUnload as EventListener); },
  };
}
export function startNavigation(commit: () => void, sameSelection: (from: URL, to: URL) => boolean) {
  active?.dispose();
  const coordinator = createNavigationCoordinator(window as unknown as NavigationHost, commit, sameSelection);
  active = coordinator;
  return () => { if (active === coordinator) { coordinator.dispose(); active = undefined; } };
}
export const navigationAvailable = () => active?.supported() ?? false;
export const invalidateNavigation = () => active?.invalidate();
export const registerLeaveGuard = (guard: LeaveGuard) => active?.register(guard) ?? (() => {});
export function requestNavigation(href: string, state: unknown = null) {
  if (active) return active.request(href, state);
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin || target.hash) return Promise.resolve(false);
  if (target.href !== window.location.href) window.history.pushState(state, '', target.href);
  window.dispatchEvent(new PopStateEvent('popstate')); return Promise.resolve(true);
}
export function replaceCurrentEntry(href = window.location.href, state: unknown = window.history.state) {
  if (active) return active.replace(href, state);
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || target.hash) return false;
  window.history.replaceState(state, '', target.href); return true;
}
// Modified clicks, downloads, anchors and another origin retain native browser behavior.
export function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
    event.currentTarget.target || event.currentTarget.hasAttribute('download')) return;
  const target = new URL(event.currentTarget.href, window.location.href);
  if (target.origin !== window.location.origin || target.hash) return;
  event.preventDefault(); void requestNavigation(target.href);
}
