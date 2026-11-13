import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/App.tsx';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';
import type { Account } from '../../src/features/usuarios/types.ts';
import { registerLeaveGuard } from '../../src/lib/navigation.ts';
import '../../src/styles.css';

// Test-only fake transport; no network fallback or retained credentials.
const scenario = new URLSearchParams(window.location.search);
if (!import.meta.env.DEV) throw new Error('Test harness requires development mode');
const calls: { path: string; method: string }[] = [];
const user = { id: 'identity-example', name: scenario.get('account') === 'long' ? 'Profesora de ejemplo con nombre compuesto y apellidos extensos para comprobar lectura completa' : 'Profesor de ejemplo',
  email: scenario.get('account') === 'long' ? `${'correo-docente-sintetico'.repeat(3)}@example.edu.co` : 'profesor@example.edu.co', role: scenario.get('role') === 'ADMIN' ? 'ADMIN' : 'TEACHER' };
let sessionActive = true, closeAttempts = 0, guardDecisions = 0;
const controller = createAuthController(createAuthClient('http://localhost:3000', async (url) => {
  calls.push({ path: new URL(url).pathname, method: url.endsWith('/get-session') ? 'GET' : 'POST' });
  if (url.endsWith('/sign-out')) {
    closeAttempts++;
    if (['pending', 'timeout'].includes(scenario.get('close') ?? '')) return new Promise<Response>(() => {});
    if (scenario.get('close') === 'unconfirmed') return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
    if (scenario.get('close') === 'network') throw new TypeError('Synthetic lost connection');
    if (scenario.get('close') === 'recover' && closeAttempts === 1) return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
    sessionActive = false;
    if (scenario.get('close') === 'lost-response') throw new TypeError('Synthetic lost response after revocation');
    if (scenario.get('close') === 'absent') return Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
    return Response.json({ success: true });
  }
  if (url.endsWith('/sign-in/email') && scenario.get('login') === 'invalid') {
    return Response.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 });
  }
  if (scenario.get('access') === 'unavailable') return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
  if (scenario.get('access') === 'absent') return Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  if (url.endsWith('/get-session')) return sessionActive ? Response.json({ user,
    session: { id: 'session-example', expiresAt: '2027-01-01T00:00:00.000Z' } }) : Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  return Response.json({ user });
}), scenario.get('close') === 'timeout' ? {
  setTimeout: (callback) => setTimeout(callback, 100), clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
} : undefined);

const accounts: Account[] = [
  { id: 'cuenta-lucia', name: 'Lucía Martínez', email: 'lucia@ejemplo.edu.co', role: 'TEACHER', status: 'ACTIVA', createdAt: '2026-10-20T14:00:00Z' },
  { id: 'cuenta-andres', name: 'Andrés Rojas', email: 'andres@ejemplo.edu.co', role: 'TEACHER', status: 'PENDIENTE', deliveryStatus: 'ENVIADA', invitationExpiresAt: '2026-11-02T14:00:00Z', createdAt: '2026-10-26T14:00:00Z' },
  { id: 'cuenta-ana', name: 'Ana Beltrán', email: 'ana@ejemplo.edu.co', role: 'TEACHER', status: 'INACTIVA', createdAt: '2026-10-18T14:00:00Z' },
  { id: 'cuenta-admin', name: 'Camilo Torres', email: 'camilo@ejemplo.edu.co', role: 'ADMIN', status: 'ACTIVA', createdAt: '2026-10-15T14:00:00Z' },
];
const businessFetch: typeof fetch = async (input, init) => {
  const target = new URL(String(input));
  calls.push({ path: target.pathname, method: init?.method ?? 'GET' });
  if (scenario.has('navigation') && target.pathname === '/api/v1/indicator-definitions') {
    if (scenario.get('navigation') === 'unavailable') return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
    return Response.json({ items: [{ metricCode: 'accuracy_pct', taskId: 'TG-01', label: 'Precisión', description: 'Definición sintética para navegación.', calculation: 'Ensayos correctos / ensayos válidos.', unit: '%', scopes: ['SESSION'], inputs: 'Ensayos válidos', unavailabilityReasons: ['NO_VALID_TARGETS'], exclusions: 'Sin ensayos válidos', rule: null }] });
  }
  if (target.pathname === '/api/v1/account-invitations/accept') {
    document.body.dataset.invitationSubmissions = String(Number(document.body.dataset.invitationSubmissions ?? 0) + 1);
    if (scenario.get('invitation') === 'unavailable') throw new TypeError('Synthetic unavailable');
    if (scenario.get('invitation') === 'pending') return new Promise<Response>(() => {});
    const status = Number(scenario.get('invitation'));
    if ([400, 409, 410, 503].includes(status)) return Response.json({ code: status === 410 ? 'INVITATION_EXPIRED' : 'ACCOUNT_CONFLICT' }, { status });
    return Response.json({ status: 'ACTIVA' });
  }
  if (target.pathname.startsWith('/api/v1/auth/password-recovery/')) {
    const count = Number(document.body.dataset.recoverySubmissions ?? 0) + 1;
    document.body.dataset.recoverySubmissions = String(count);
    if (scenario.get('recovery') === 'unavailable') throw new TypeError('Synthetic unavailable');
    if (scenario.get('recovery') === 'pending') return new Promise<Response>(() => {});
    const status = Number(scenario.get('recovery'));
    if ([400, 410, 503].includes(status)) return Response.json({ code: status === 410 ? 'VERIFICATION_EXPIRED' : 'INVALID_INPUT' }, { status });
    return target.pathname.endsWith('/request') ? Response.json({ message: 'Si corresponde, recibirás instrucciones en tu correo.' }, { status: 202 }) : Response.json({ success: true });
  }
  if (scenario.get('business') === 'unavailable') throw new TypeError('Synthetic unavailable');
  if (init?.method !== 'GET') {
    if (scenario.get('write') === 'pending') return new Promise<Response>(() => {});
    if (!['success', 'conflict'].includes(scenario.get('write') ?? '')) throw new TypeError('Synthetic uncertain write');
    const payload = JSON.parse(String(init?.body));
    if (scenario.get('write') === 'conflict' && accounts.some(account => account.email === payload.email))
      return Response.json({ code: 'CONFLICT' }, { status: 409 });
    if (target.pathname === '/api/v1/accounts') {
      const created: Account = { id: 'synthetic-new', name: payload.name, email: payload.email, role: 'TEACHER', status: 'PENDIENTE', createdAt: '2026-10-26T14:00:00Z', deliveryStatus: 'ENVIADA' };
      accounts.push(created); return Response.json(created, { status: 201 });
    }
    const record = accounts.find(account => target.pathname.startsWith(`/api/v1/accounts/${account.id}`));
    if (!record) return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (target.pathname.endsWith('/deactivate')) record.status = 'INACTIVA';
    else if (target.pathname.endsWith('/role')) record.role = 'TEACHER';
    else {
      if (payload.name) record.name = payload.name;
      if (payload.email && payload.email !== record.email) record.pendingEmail = payload.email;
    }
    return Response.json(record);
  }
  if (scenario.get('business') === 'forbidden') return Response.json({ code: 'FORBIDDEN' }, { status: 403 });
  const url = new URL(String(input));
  if (url.pathname === '/api/v1/accounts') {
    const items = scenario.get('business') === 'empty' ? [] : accounts.filter(account => !url.searchParams.has('status') || account.status === url.searchParams.get('status'));
    return Response.json({ items, total: items.length, limit: 20, offset: 0 });
  }
  const account = accounts.find(item => url.pathname === `/api/v1/accounts/${item.id}`);
  return account ? Response.json(account) : Response.json({ code: 'NOT_FOUND' }, { status: 404 });
};

// Synthetic token only: never a mailbox URL or real token in this test harness.
let recoveryToken = scenario.get('ticket') === 'valid' ? 'synthetic-recovery-only' : undefined;
let invitationToken = scenario.get('ticket') === 'valid' ? 'synthetic-invitation-only' : undefined;
const path = scenario.get('path') ?? '/';
history.replaceState(null, '', path);
Object.assign(window, { usuarioCalls: calls, accountHarness: {
  suspend: () => controller.suspend(), resume: () => controller.resume(),
  installGuard: () => registerLeaveGuard({ dirty: () => true, valid: () => controller.getSnapshot().kind === 'authenticated',
    decide: async () => { guardDecisions++; return false; }, cancel() {}, discard() {}, unavailable() {} }),
  guardDecisions: () => guardDecisions,
} });
const initialEntry = path.startsWith('/recuperar-acceso') || path === '/acceso/invitacion' ? {
  route: resolveRoute(path, ''), recovery: { read: () => recoveryToken, clear: () => { recoveryToken = undefined; } }, invitation: { read: () => invitationToken, clear: () => { invitationToken = undefined; } },
} : undefined;

createRoot(document.getElementById('root')!).render(<StrictMode>
  <App controller={controller} apiOrigin="http://localhost:3000" fetcher={businessFetch} initialEntry={initialEntry} pathname={path} search={scenario.has('blocked') ? '?token=synthetic' : ''} />
</StrictMode>);
