import type { Identity } from './state.ts';

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;
export type SessionResult =
  | { kind: 'success'; user: Identity; session: { id: string; expiresAt: string } }
  | { kind: 'absent' | 'unconfirmed' };
export type SignInResult = { kind: 'success'; user: Identity } | { kind: 'input' | 'credentials' | 'unconfirmed' };
export type SignOutResult = { kind: 'success' | 'absent' | 'unconfirmed' };
export type AuthClient = {
  getSession(signal: AbortSignal): Promise<SessionResult>;
  signIn(email: string, password: string, signal: AbortSignal): Promise<SignInResult>;
  signOut(signal: AbortSignal): Promise<SignOutResult>;
};

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
function identity(value: unknown): Identity | undefined {
  if (!object(value) || typeof value.id !== 'string' || typeof value.email !== 'string' ||
      typeof value.name !== 'string' || (value.role !== 'ADMIN' && value.role !== 'TEACHER')) return;
  return { id: value.id, email: value.email, name: value.name, role: value.role };
}

export function createAuthClient(fetcher: Fetch = (url, init) => fetch(url, init)): AuthClient {
  async function request(path: string, signal: AbortSignal, body?: { email: string; password: string }) {
    const response = await fetcher(`/api/auth/${path}`, {
      method: path === 'get-session' ? 'GET' : 'POST',
      credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.redirected || !response.headers.get('content-type')?.toLowerCase().includes('application/json')) return;
    const data: unknown = await response.json();
    if (!object(data)) return;
    return { status: response.status, data };
  }
  return {
    async getSession(signal) {
      try {
        const result = await request('get-session', signal);
        if (result?.status === 401 && result.data.code === 'UNAUTHENTICATED') return { kind: 'absent' };
        if (result?.status === 200) {
          const user = identity(result.data.user);
          const session = result.data.session;
          if (user && object(session) && typeof session.id === 'string' && typeof session.expiresAt === 'string' &&
              /^\d{4}-\d{2}-\d{2}T/.test(session.expiresAt) && Number.isFinite(Date.parse(session.expiresAt)))
            return { kind: 'success', user, session: { id: session.id, expiresAt: session.expiresAt } };
        }
      } catch { /* No raw exception or provider response escapes the client. */ }
      return { kind: 'unconfirmed' };
    },
    async signIn(email, password, signal) {
      try {
        const result = await request('sign-in/email', signal, { email, password });
        if (result?.status === 400 && result.data.code === 'INVALID_INPUT') return { kind: 'input' };
        if (result?.status === 401 && result.data.code === 'INVALID_CREDENTIALS') return { kind: 'credentials' };
        const user = result?.status === 200 && identity(result.data.user);
        if (user) return { kind: 'success', user };
      } catch { /* Never retain submitted credentials in diagnostics. */ }
      return { kind: 'unconfirmed' };
    },
    async signOut(signal) {
      try {
        const result = await request('sign-out', signal);
        if (result?.status === 200 && result.data.success === true) return { kind: 'success' };
        if (result?.status === 401 && result.data.code === 'UNAUTHENTICATED') return { kind: 'absent' };
      } catch { /* A lost response cannot confirm server-side revocation. */ }
      return { kind: 'unconfirmed' };
    },
  };
}
