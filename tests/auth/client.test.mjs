import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from '../../src/auth/client.ts';

const user = { id: 'synthetic', email: 'teacher@example.edu.co', name: 'Ejemplo', role: 'TEACHER' };
const signal = () => new AbortController().signal;
const origin = 'http://localhost:3000';
const json = (data, status = 200) => Response.json(data, { status });
for (const [status, data, kind] of [[200, { success: true }, 'success'], [200, { success: 1 }, 'unconfirmed'],
  [200, { success: false }, 'unconfirmed'], [401, { code: 'UNAUTHENTICATED' }, 'absent'],
  [401, { code: 'OTHER' }, 'unconfirmed'], [403, { code: 'INVALID_ORIGIN' }, 'unconfirmed'],
  [429, { message: 'rate limit' }, 'unconfirmed'], [503, { code: 'UNAVAILABLE' }, 'unconfirmed']]) {
  test(`US3: close ${status}/${JSON.stringify(data)} => ${kind}`, async () => {
    let calls = 0;
    let sent;
    const client = createAuthClient(origin, async (url, init) => {
      calls++; sent = { url, init };
      return json(data, status);
    });
    assert.deepEqual(await client.signOut(signal()), { kind }); assert.equal(calls, 1);
    assert.equal(sent.url, origin + '/api/auth/sign-out'); assert.equal(sent.init.method, 'POST');
    assert.equal(sent.init.body, '{}'); assert.equal(new Headers(sent.init.headers).get('content-type'), 'application/json');
    assert.equal(sent.init.redirect, 'error'); assert.equal(sent.init.credentials, 'include');
  });
}
test('US2: get-session filters fields and uses no body or JavaScript credential', async () => {
  const client = createAuthClient(origin, async (url, init) => {
    assert.equal(url, origin + '/api/auth/get-session'); assert.equal(init.method, 'GET');
    assert.equal(init.body, undefined); assert.equal(init.credentials, 'include');
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(new Headers(init.headers).get('content-type'), null);
    return json({ user: { ...user, token: 'secret' }, session: { id: 's', expiresAt: '2027-01-01T00:00:00.000Z', token: 'secret' } });
  });
  assert.deepEqual(await client.getSession(signal()), { kind: 'success', user, session: { id: 's', expiresAt: '2027-01-01T00:00:00.000Z' } });
});
for (const data of [{}, { user, session: {} }, { user, session: { id: 's', expiresAt: 'invalid' } },
  { user: { ...user, role: 'STUDENT' }, session: { id: 's', expiresAt: '2027-01-01T00:00:00Z' } }]) {
  test('US2: malformed session never grants access', async () => {
    assert.deepEqual(await createAuthClient(origin, async () => json(data)).getSession(signal()), { kind: 'unconfirmed' });
  });
}
for (const [status, code, kind] of [[401, 'UNAUTHENTICATED', 'absent'], [401, 'INVALID_CREDENTIALS', 'unconfirmed'], [503, 'UNAVAILABLE', 'unconfirmed']]) {
  test(`US2: ${status}/${code} is ${kind}`, async () => {
    assert.deepEqual(await createAuthClient(origin, async () => json({ code }, status)).getSession(signal()), { kind });
  });
}
test('US1: login sends explicit credentials and fixed rememberMe through cookie fetch and filters secrets', async () => {
  let calls = 0;
  const client = createAuthClient(origin, async (url, init) => {
    calls++;
    assert.equal(url, origin + '/api/auth/sign-in/email');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { email: 'a@example.test', password: 'synthetic-only', rememberMe: false });
    assert.equal(init.credentials, 'include');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.equal(new Headers(init.headers).get('authorization'), null);
    assert.equal(new Headers(init.headers).get('content-type'), 'application/json');
    assert.ok(init.signal);
    return json({ user: { ...user, password: 'secret', token: 'secret' }, token: 'secret' });
  });
  assert.deepEqual(await client.signIn('a@example.test', 'synthetic-only', signal()), { kind: 'success', user });
  assert.equal(calls, 1);
});
for (const [status, code, kind] of [[400, 'INVALID_INPUT', 'input'], [401, 'INVALID_CREDENTIALS', 'credentials'],
  [503, 'UNAVAILABLE', 'unconfirmed'], [401, 'UNAUTHENTICATED', 'unconfirmed'], [403, 'FORBIDDEN', 'unconfirmed'],
  [429, 'RATE_LIMIT', 'unconfirmed'], [200, 'OTHER', 'unconfirmed']]) {
  test(`US1: status ${status}/${code} => ${kind}`, async () => {
    const client = createAuthClient(origin, async () => json({ code, message: 'untrusted secret' }, status));
    assert.deepEqual(await client.signIn('a@example.test', 'synthetic-only', signal()), { kind });
  });
}
for (const data of [{}, { user: { ...user, role: 'STUDENT' } }, { user: { ...user, name: null } }]) {
  test('US1: incomplete or unexpected identity does not grant access', async () => {
    const client = createAuthClient(origin, async () => json(data));
    assert.deepEqual(await client.signIn('a', 'b', signal()), { kind: 'unconfirmed' });
  });
}
for (const fetcher of [async () => { throw Error('secret'); }, async () => new Response('{broken', { headers: { 'content-type': 'application/json' } }),
  async () => new Response('secret'), async () => new Response(null, { status: 302 })]) {
  test('US1: network, malformed JSON, text and redirect remain unconfirmed', async () => {
    assert.deepEqual(await createAuthClient(origin, fetcher).signIn('a', 'b', signal()), { kind: 'unconfirmed' });
  });
}
