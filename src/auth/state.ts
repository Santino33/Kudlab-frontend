export type Identity = { id: string; email: string; name: string; role: 'ADMIN' | 'TEACHER' };
export type CheckContext = 'initial' | 'session' | 'signIn' | 'signOut' | 'denied';
export type AccessState = { generation: number } & (
  | { kind: 'checking'; context: CheckContext; notice?: 'loginUnconfirmed' }
  | { kind: 'signedOut'; reason: 'absent' | 'lost' | 'closed'; error?: 'input' | 'credentials' | 'loginUnconfirmed' }
  | { kind: 'signingIn' }
  | { kind: 'authenticated'; user: Identity; denied: boolean }
  | { kind: 'checkUnavailable'; context: CheckContext }
  | { kind: 'signingOut' }
  | { kind: 'signOutUnconfirmed' }
);
export type Denial = { generation: number; category: 'unauthenticated' | 'forbidden' | 'unavailable' };
export type AccessEvent = AccessState | (Denial & { kind: 'denial' });
export const initialState = (): AccessState => ({ kind: 'checking', generation: 0, context: 'initial' });

// Expanded by each story; events never carry credentials or raw responses.
export function transition(state: AccessState, event: AccessEvent): AccessState {
  if (event.generation < state.generation) return state;
  // Reconstruct known fields: even a runtime event cannot smuggle identity into checking.
  const base = { generation: event.generation };
  switch (event.kind) {
    case 'checking': return { ...base, kind: event.kind, context: event.context,
      ...(event.notice ? { notice: event.notice } : {}) };
    case 'signedOut': return { ...base, kind: event.kind, reason: event.reason,
      ...(event.error ? { error: event.error } : {}) };
    case 'authenticated': return { ...base, kind: event.kind,
      user: { id: event.user.id, email: event.user.email, name: event.user.name, role: event.user.role }, denied: event.denied };
    case 'signingIn': return { ...base, kind: event.kind };
    case 'checkUnavailable': return { ...base, kind: event.kind, context: event.context };
    case 'signingOut':
    case 'signOutUnconfirmed': return { ...base, kind: event.kind };
    case 'denial':
      if (event.category === 'unauthenticated') return { ...base, kind: 'signedOut', reason: 'lost' };
      if (event.category === 'forbidden') return { ...base, kind: 'checking', context: 'denied' };
      return { ...base, kind: 'checkUnavailable', context: 'session' };
  }
}
