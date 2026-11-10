import test from 'node:test';
import assert from 'node:assert/strict';
import { captureEntry } from '../../src/features/usuarios/navigation.ts';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';

test('invitation entry keeps a single token in memory, not in history or the recovery ticket', () => {
  const writes = [];
  const entry = captureEntry({ pathname: '/acceso/invitacion', search: '?token=synthetic&extra=private', hash: '#private' },
    { replaceState: (...args) => writes.push(args) });
  assert.equal(entry.route.kind, 'invitationAccept');
  assert.deepEqual(writes, [[null, '', '/acceso/invitacion']]);
  assert.equal(entry.invitation.read(), 'synthetic');
  assert.equal(entry.recovery.read(), undefined);
  assert.equal(JSON.stringify(entry).includes('synthetic'), false);
  entry.invitation.clear();
  assert.equal(entry.invitation.read(), undefined);
});

test('missing, empty, whitespace and duplicate tokens cannot be used; recovery is separate', () => {
  for (const search of ['', '?token=', '?token=%20', '?token=a&token=b']) {
    const entry = captureEntry({ pathname: '/acceso/invitacion', search, hash: '' }, { replaceState() {} });
    assert.equal(entry.route.kind, 'invitationAccept');
    assert.equal(entry.invitation.read(), undefined);
  }
  const entry = captureEntry({ pathname: '/recuperar-acceso/confirmar', search: '?token=recovery', hash: '' }, { replaceState() {} });
  assert.equal(entry.invitation.read(), undefined);
  assert.equal(entry.recovery.read(), 'recovery');
});

test('accept sends only token/password and requires confirmed ACTIVA, without login or retry', async () => {
  const calls = [];
  const api = createUsuariosApi(createHttpClient('http://localhost:3000', { getGeneration: () => 0, notify() {} }, async (url, init) => {
    calls.push([url, init.method, JSON.parse(init.body)]);
    return Response.json({ status: 'ACTIVA' });
  }));
  assert.deepEqual(await api.acceptInvitation('synthetic', 'ValidPass1', new AbortController().signal), { kind: 'success', data: true });
  assert.deepEqual(calls, [['http://localhost:3000/api/v1/account-invitations/accept', 'POST', { token: 'synthetic', password: 'ValidPass1' }]]);
});

for (const status of [400, 409, 410, 503]) test(`accept ${status} is handled without retries or trusting server text`, async () => {
  let calls = 0;
  const api = createUsuariosApi(createHttpClient('http://localhost:3000', { getGeneration: () => 0, notify() {} }, async () => {
    calls++;
    return Response.json({ code: status === 410 ? 'INVITATION_EXPIRED' : 'ACCOUNT_CONFLICT', message: 'untrusted' }, { status });
  }));
  const result = await api.acceptInvitation('synthetic', 'ValidPass1', new AbortController().signal);
  assert.equal(result.kind, 'error');
  assert.equal(result.status, status);
  assert.equal(result.uncertain, status === 503);
  assert.equal(JSON.stringify(result).includes('untrusted'), false);
  assert.equal(calls, 1);
});

test('unconfirmed success and network loss are uncertain and never retried', async () => {
  for (const response of [() => Response.json({ status: 'PENDIENTE' }), () => { throw new Error('offline'); }]) {
    let calls = 0;
    const api = createUsuariosApi(createHttpClient('http://localhost:3000', { getGeneration: () => 0, notify() {} }, async () => { calls++; return response(); }));
    assert.deepEqual(await api.acceptInvitation('synthetic', 'ValidPass1', new AbortController().signal), { kind: 'unavailable', uncertain: true });
    assert.equal(calls, 1);
  }
});
