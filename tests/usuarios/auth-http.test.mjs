import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthClient } from '../../src/auth/client.ts';

const origin = 'http://localhost:3000';
const signal = () => new AbortController().signal;
const user = { id: 'identity-example', email: 'profesor@example.edu.co', name: 'Profesor', role: 'TEACHER' };

test('explicit origin, cookie transport, fixed rememberMe:false, empty JSON logout and filtered identity', async () => {
  const calls = [];
  const client = createAuthClient(origin, async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/sign-out')) return Response.json({ success: true });
    return Response.json({ user: { ...user, token: 'secret' },
      session: { id: 'session-example', expiresAt: '2027-01-01T00:00:00Z', token: 'secret' }, token: 'secret' });
  });
  assert.deepEqual(await client.signIn(user.email, 'x', signal()), { kind: 'success', user });
  assert.equal((await client.getSession(signal())).kind, 'success');
  assert.deepEqual(await client.signOut(signal()), { kind: 'success' });
  assert.deepEqual(calls.map(c => c.url), [origin + '/api/auth/sign-in/email', origin + '/api/auth/get-session', origin + '/api/auth/sign-out']);
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: user.email, password: 'x', rememberMe: false });
  assert.equal(calls[1].init.body, undefined);
  assert.equal(calls[2].init.body, '{}');
  for (const { init } of calls) {
    assert.equal(init.credentials, 'include');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.equal(new Headers(init.headers).has('Authorization'), false);
  }
});

for (const [status, code, kind] of [[400, 'INVALID_INPUT', 'input'], [401, 'INVALID_CREDENTIALS', 'credentials'],
  [503, 'UNAVAILABLE', 'unconfirmed']]) {
  test(`login ${status} has safe result and no retry`, async () => {
    let calls = 0;
    const client = createAuthClient(origin, async () => { calls++; return Response.json({ code, message: 'secret' }, { status }); });
    assert.deepEqual(await client.signIn(user.email, 'x', signal()), { kind });
    assert.equal(calls, 1);
  });
}

test('provider close errors and non-JSON never confirm revocation or replay', async () => {
  for (const status of [403, 429, 503]) {
    let calls = 0;
    const client = createAuthClient(origin, async () => { calls++; return new Response('untrusted', { status }); });
    assert.deepEqual(await client.signOut(signal()), { kind: 'unconfirmed' });
    assert.equal(calls, 1);
  }
});

test('missing or untrusted origin never creates an auth transport', () => {
  for (const value of [undefined, '', '//external', 'https://user:pass@example.com', 'https://example.com/a']) {
    assert.throws(() => createAuthClient(value));
  }
});
