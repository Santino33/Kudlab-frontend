import type { HttpClient } from '../../lib/http.ts';
import { parseAccount, parseAccountPage } from './types.ts';
import type { Account, AccountStatus } from './types.ts';

export function createUsuariosApi(http: HttpClient) {
  const base = '/api/v1/accounts';
  const path = (id: string) => `${base}/${encodeURIComponent(id)}`;
  const accountResponse = (status: number) => (data: unknown, actual: number) => actual === status ? parseAccount(data) : undefined;
  return {
    listAccounts(offset: number, status: AccountStatus | undefined, signal: AbortSignal) {
      const query = new URLSearchParams({ limit: '20', offset: String(offset) });
      if (status) query.set('status', status);
      return http.request(`${base}?${query}`, { signal, decode: (body, code) => code === 200 ? parseAccountPage(body) : undefined });
    },
    getAccount(id: string, signal: AbortSignal) {
      return http.request(path(id), { signal, decode: accountResponse(200) });
    },
    createAccount(input: { name: string; email: string }, signal: AbortSignal) {
      return http.request(base, { method: 'POST', signal, body: { name: input.name.trim(), email: input.email.trim().toLowerCase(), role: 'TEACHER' }, decode: accountResponse(201) });
    },
    updateAccount(id: string, input: { name?: string; email?: string }, signal: AbortSignal) {
      return http.request(path(id), { method: 'PATCH', signal,
        body: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.email !== undefined ? { email: input.email } : {}) }, decode: accountResponse(200) });
    },
    reissueInvitation(account: Account, signal: AbortSignal) {
      return http.request(path(account.id), { method: 'PATCH', signal, body: { email: account.email }, decode: accountResponse(200) });
    },
    deactivateAccount(id: string, signal: AbortSignal) {
      return http.request(`${path(id)}/deactivate`, { method: 'POST', signal, body: { confirm: true }, decode: accountResponse(200) });
    },
    demoteAccount(id: string, signal: AbortSignal) {
      return http.request(`${path(id)}/role`, { method: 'PUT', signal, body: { role: 'TEACHER' }, decode: accountResponse(200) });
    },
    requestRecovery(email: string, signal: AbortSignal) {
      return http.request('/api/v1/auth/password-recovery/request', { method: 'POST', signal, body: { email: email.trim().toLowerCase() },
        decode: (data, status) => status === 202 && typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string' ? true : undefined });
    },
    confirmRecovery(token: string, newPassword: string, signal: AbortSignal) {
      return http.request('/api/v1/auth/password-recovery/confirm', { method: 'POST', signal, body: { token, newPassword },
        decode: (data, status) => status === 200 && typeof data === 'object' && data !== null && 'success' in data && data.success === true ? true : undefined });
    },
  };
}
export type UsuariosApi = ReturnType<typeof createUsuariosApi>;
