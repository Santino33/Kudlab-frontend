import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/App.tsx';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import '../../src/styles.css';

// Test-only fake transport; no network fallback or retained credentials.
const scenario = new URLSearchParams(window.location.search);
const user = { id: 'identity-example', name: 'Profesor de ejemplo',
  email: 'profesor@example.edu.co', role: scenario.get('role') === 'ADMIN' ? 'ADMIN' : 'TEACHER' };
const controller = createAuthController(createAuthClient('http://localhost:3000', async (url) => {
  if (url.endsWith('/sign-out')) {
    if (scenario.get('close') === 'pending') return new Promise<Response>(() => {});
    if (scenario.get('close') === 'unconfirmed') return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
    return Response.json({ success: true });
  }
  if (url.endsWith('/sign-in/email') && scenario.get('login') === 'invalid') {
    return Response.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 });
  }
  if (scenario.get('access') === 'unavailable') return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
  if (scenario.get('access') === 'absent') return Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  if (url.endsWith('/get-session')) return Response.json({ user,
    session: { id: 'session-example', expiresAt: '2027-01-01T00:00:00.000Z' } });
  return Response.json({ user });
}));

const accounts = [
  { id: 'cuenta-lucia', name: 'Lucía Martínez', email: 'lucia@ejemplo.edu.co', role: 'TEACHER', status: 'ACTIVA', createdAt: '2026-10-20T14:00:00Z' },
  { id: 'cuenta-andres', name: 'Andrés Rojas', email: 'andres@ejemplo.edu.co', role: 'TEACHER', status: 'PENDIENTE', deliveryStatus: 'ENVIADA', invitationExpiresAt: '2026-11-02T14:00:00Z', createdAt: '2026-10-26T14:00:00Z' },
  { id: 'cuenta-ana', name: 'Ana Beltrán', email: 'ana@ejemplo.edu.co', role: 'TEACHER', status: 'INACTIVA', createdAt: '2026-10-18T14:00:00Z' },
  { id: 'cuenta-admin', name: 'Camilo Torres', email: 'camilo@ejemplo.edu.co', role: 'ADMIN', status: 'ACTIVA', createdAt: '2026-10-15T14:00:00Z' },
];
const businessFetch: typeof fetch = async (input, init) => {
  if (scenario.get('business') === 'unavailable' || init?.method !== 'GET') throw new TypeError('Synthetic unavailable');
  if (scenario.get('business') === 'forbidden') return Response.json({ code: 'FORBIDDEN' }, { status: 403 });
  const url = new URL(String(input));
  if (url.pathname === '/api/v1/accounts') {
    const items = scenario.get('business') === 'empty' ? [] : accounts.filter(account => !url.searchParams.has('status') || account.status === url.searchParams.get('status'));
    return Response.json({ items, total: items.length, limit: 20, offset: 0 });
  }
  const account = accounts.find(item => url.pathname === `/api/v1/accounts/${item.id}`);
  return account ? Response.json(account) : Response.json({ code: 'NOT_FOUND' }, { status: 404 });
};

createRoot(document.getElementById('root')!).render(<StrictMode>
  <App controller={controller} apiOrigin="http://localhost:3000" fetcher={businessFetch} pathname={scenario.get('path') ?? '/'} search={scenario.has('blocked') ? '?token=synthetic' : ''} />
</StrictMode>);
