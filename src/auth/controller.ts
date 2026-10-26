import type { AuthClient, SessionResult } from './client.ts';
import { initialState, transition } from './state.ts';
import type { AccessState, CheckContext, Denial } from './state.ts';

export type Clock = { setTimeout(callback: () => void, ms: number): unknown; clearTimeout(id: unknown): void };
const clock: Clock = { setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>) };

export function createAuthController(client: AuthClient, timer: Clock = clock) {
  let state = initialState();
  let generation = 0;
  let operation = 0;
  let active = false;
  let suspended = true;
  let hadAccess = false;
  let closeIntent = false;
  let denied = false;
  let flight: { abort: AbortController; settled: Promise<void>; cancelTimer(): void } | undefined;
  const listeners = new Set<() => void>();
  const publish = (event: AccessState) => {
    const next = transition(state, event);
    if (next !== state) { state = next; listeners.forEach((listener) => listener()); }
  };
  const current = (value: number) => active && !suspended && generation === value;

  // A timeout stops waiting visually, not server-side execution. Keep the transport
  // lock until settlement, including injected fetch implementations that ignore abort.
  async function run<T>(request: (signal: AbortSignal) => Promise<T>, result: (value: T | undefined) => void,
    timedOut: () => void) {
    if (flight) return;
    const gen = generation;
    const id = ++operation;
    const abort = new AbortController();
    let expired = false;
    let settle!: () => void;
    const settled = new Promise<void>((resolve) => { settle = resolve; });
    const timeout = timer.setTimeout(() => {
      expired = true;
      abort.abort();
      if (current(gen) && operation === id) timedOut();
    }, 15_000);
    flight = { abort, settled, cancelTimer: () => timer.clearTimeout(timeout) };
    let value: T | undefined;
    try { value = await request(abort.signal); } catch { /* Already normalized by the client in production. */ }
    finally {
      timer.clearTimeout(timeout);
      flight = undefined;
      settle();
    }
    if (current(gen) && operation === id) result(expired ? undefined : value);
  }

  function acceptSession(result: SessionResult | undefined, context: CheckContext) {
    if (closeIntent) {
      if (result?.kind === 'success') close();
      else if (result?.kind === 'absent') finishClose();
      else publish({ kind: 'signOutUnconfirmed', generation });
      return;
    }
    if (result?.kind === 'success') {
      hadAccess = true;
      publish({ kind: 'authenticated', generation, user: result.user, denied });
    } else if (result?.kind === 'absent') {
      publish({ kind: 'signedOut', generation, reason: hadAccess ? 'lost' : 'absent',
        ...(context === 'signIn' ? { error: 'loginUnconfirmed' as const } : {}) });
    } else publish({ kind: 'checkUnavailable', generation, context });
  }

  function finishClose() {
    closeIntent = false;
    denied = false;
    hadAccess = false;
    publish({ kind: 'signedOut', generation, reason: 'closed' });
  }

  function close() {
    if (!active || suspended || flight) return;
    closeIntent = true;
    generation++;
    publish({ kind: 'signingOut', generation });
    void run((signal) => client.signOut(signal), (result) => {
      if (result?.kind === 'success' || result?.kind === 'absent') finishClose();
      else publish({ kind: 'signOutUnconfirmed', generation });
    }, () => publish({ kind: 'signOutUnconfirmed', generation }));
  }

  async function check(context: CheckContext) {
    const gen = ++generation;
    publish({ kind: 'checking', generation, context,
      ...(context === 'signIn' ? { notice: 'loginUnconfirmed' as const } : {}) });
    const pending = flight;
    pending?.cancelTimer();
    pending?.abort.abort();
    if (pending) await pending.settled;
    if (!current(gen)) return;
    void run((signal) => client.getSession(signal), (value) => acceptSession(value, context),
      () => acceptSession(undefined, context));
  }

  return {
    getSnapshot: () => state,
    getGeneration: () => generation,
    notify(denial: Denial) {
      if (!active || suspended || denial.generation !== generation) return;
      if (denial.category === 'forbidden') {
        denied = true;
        void check('denied');
      } else {
        generation++;
        flight?.cancelTimer();
        flight?.abort.abort();
        if (closeIntent) {
          if (denial.category === 'unauthenticated') finishClose();
          else publish({ kind: 'signOutUnconfirmed', generation });
        } else publish(transition(state, { kind: 'denial', generation, category: denial.category }));
      }
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { if (active) return; active = true; suspended = false; void check('initial'); },
    stop() { active = false; suspended = true; generation++; flight?.cancelTimer(); flight?.abort.abort();
      publish({ kind: 'checking', generation, context: closeIntent ? 'signOut' : 'session' }); },
    retry() {
      if (flight || !active || suspended) return;
      if (state.kind === 'checkUnavailable') void check(state.context);
      else if (state.kind === 'signOutUnconfirmed') void check('signOut');
    },
    signIn(email: string, password: string) {
      if (!active || suspended || flight || state.kind !== 'signedOut') return;
      generation++;
      denied = false;
      publish({ kind: 'signingIn', generation });
      void run((signal) => client.signIn(email, password, signal), (result) => {
        if (result?.kind === 'success') {
          hadAccess = true;
          publish({ kind: 'authenticated', generation, user: result.user, denied: false });
        } else if (result?.kind === 'input' || result?.kind === 'credentials') {
          publish({ kind: 'signedOut', generation, reason: 'absent', error: result.kind });
        } else void check('signIn');
      }, () => publish({ kind: 'checking', generation, context: 'signIn', notice: 'loginUnconfirmed' }));
    },
    signOut() { if (state.kind === 'authenticated') close(); },
    suspend() {
      if (!active || suspended) return;
      suspended = true;
      generation++;
      flight?.cancelTimer();
      flight?.abort.abort();
      publish({ kind: 'checking', generation, context: closeIntent ? 'signOut' :
        state.kind === 'signingIn' || (state.kind === 'checking' && state.context === 'signIn') ? 'signIn' : 'session' });
    },
    resume() {
      if (!active || !suspended) return;
      suspended = false;
      void check(closeIntent ? 'signOut' : state.kind === 'checking' ? state.context : 'session');
    },
  };
}
export type AuthController = ReturnType<typeof createAuthController>;
