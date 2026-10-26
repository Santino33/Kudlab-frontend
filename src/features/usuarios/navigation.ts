import type { AccessState } from '../../auth/state.ts';

export const canManageAccounts = (state: AccessState) => state.kind === 'authenticated' && state.user.role === 'ADMIN' && !state.denied;

export type Route =
  | { kind: 'entry' | 'access' | 'accounts' | 'invite' | 'recoveryRequest' |
      'recoveryConfirm' | 'unavailable' | 'blockedLink' }
  | { kind: 'detail' | 'edit'; accountId: string };

export function resolveRoute(pathname: string, search: string): Route {
  if (new URLSearchParams(search).has('token') && pathname !== '/recuperar-acceso/confirmar') {
    return { kind: 'blockedLink' };
  }
  switch (pathname) {
    case '/': return { kind: 'entry' };
    case '/acceso': return { kind: 'access' };
    case '/usuarios': return { kind: 'accounts' };
    case '/usuarios/nueva': return { kind: 'invite' };
    case '/recuperar-acceso': return { kind: 'recoveryRequest' };
    case '/recuperar-acceso/confirmar': return { kind: 'recoveryConfirm' };
  }
  const match = /^\/usuarios\/([^/]+)(\/editar)?$/.exec(pathname);
  if (match) {
    try {
      const accountId = decodeURIComponent(match[1]);
      if (accountId && !/[/?#\\]/.test(accountId) && !['.', '..'].includes(accountId)) {
        return { kind: match[2] ? 'edit' : 'detail', accountId };
      }
    } catch { /* Malformed paths must not become requests. */ }
  }
  return { kind: 'unavailable' };
}

export type RecoveryTicket = { read(): string | undefined; clear(): void };
export function captureEntry(location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  history: Pick<History, 'replaceState'>): { route: Route; recovery: RecoveryTicket } {
  const route = resolveRoute(location.pathname, location.search);
  const params = new URLSearchParams(location.search);
  const values = params.getAll('token');
  let token = route.kind === 'recoveryConfirm' && values.length === 1 && values[0] ? values[0] : undefined;
  if (params.has('token')) history.replaceState(null, '', location.pathname);
  return { route, recovery: { read: () => token, clear: () => { token = undefined; } } };
}
