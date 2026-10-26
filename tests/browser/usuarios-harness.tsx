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

createRoot(document.getElementById('root')!).render(<StrictMode>
  <App controller={controller} apiOrigin="http://localhost:3000" fetcher={async () => { throw new TypeError('Synthetic unavailable'); }} pathname={scenario.get('path') ?? '/'} search={scenario.has('blocked') ? '?token=synthetic' : ''} />
</StrictMode>);
