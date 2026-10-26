import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageAccounts } from '../../src/features/usuarios/navigation.ts';
import { dashboardFeatures } from '../../src/features/usuarios/dashboard.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import { createHttpClient } from '../../src/lib/http.ts';

test('role destinations depend on confirmed identity, not account or session IDs', () => {
  assert.deepEqual(dashboardFeatures('TEACHER'), []);
  assert.deepEqual(dashboardFeatures('ADMIN').map(feature => feature.href), ['/usuarios', '/usuarios/nueva']);
  assert.equal(canManageAccounts({ kind: 'authenticated', user: { role: 'ADMIN' } }), true);
  assert.equal(canManageAccounts({ kind: 'authenticated', user: { role: 'ADMIN' }, denied: true }), false);
  for (const state of [{ kind: 'checking' }, { kind: 'authenticated', user: { role: 'TEACHER' } },
    { kind: 'signedOut' }, { kind: 'checkUnavailable' }]) assert.equal(canManageAccounts(state), false);
});

test('business denial removes protected access and rechecks role without replay', async () => {
  const roles = ['ADMIN', 'TEACHER'];
  let checks = 0;
  const controller = createAuthController({
    async getSession() { return { kind: 'success', user: { id: 'identity', name: 'Profesor', email: 'p@example.edu.co', role: roles[checks++] },
      session: { id: 'session', expiresAt: '2027-01-01T00:00:00Z' } }; },
    async signIn() { throw new Error('Unexpected login'); },
    async signOut() { throw new Error('Unexpected logout'); },
  });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  controller.start(); await tick();
  let calls = 0;
  const client = createHttpClient('http://localhost:3000', controller, async () => {
    calls++; return Response.json({ code: 'FORBIDDEN' }, { status: 403 });
  });
  const observed = [];
  const unsubscribe = controller.subscribe(() => observed.push(controller.getSnapshot().kind));
  const result = await client.request('/api/v1/accounts', { signal: new AbortController().signal, decode: () => undefined });
  assert.equal(result.kind, 'error');
  assert.equal(observed.includes('checking'), true);
  await tick();
  assert.equal(canManageAccounts(controller.getSnapshot()), false);
  assert.equal(controller.getSnapshot().user.role, 'TEACHER');
  assert.equal(calls, 1);
  assert.equal(checks, 2);
  unsubscribe(); controller.stop();
});
