import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';

const user = { id: 'synthetic', email: 'teacher@example.edu.co', name: 'Ejemplo', role: 'TEACHER' };
const session = (role = 'TEACHER') => ({ user: { ...user, role }, session: { id: 'synthetic-session', expiresAt: '2027-01-01T00:00:00.000Z' } });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture() {
  const calls = [];
  const timers = new Map();
  let timerId = 0;
  const client = createAuthClient((url, init) => new Promise((resolve, reject) => {
    calls.push({ url, signal: init.signal, resolve: (data, status = 200) => resolve(Response.json(data, { status })), reject });
  }));
  const controller = createAuthController(client, {
    setTimeout(fn, ms) { assert.equal(ms, 15000); timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  controller.start();
  return { controller, calls, timers,
    async signedOut() { calls.at(-1).resolve({ code: 'UNAUTHENTICATED' }, 401); await tick(); },
    async authenticated() { calls.at(-1).resolve(session()); await tick(); },
  };
}
for (const role of ['ADMIN', 'TEACHER']) test(`US1: ${role} sign-in and ten repeated activations`, async () => {
  const f = fixture(); await f.signedOut();
  assert.equal(f.controller.getSnapshot().kind, 'signedOut');
  for (let n = 0; n < 10; n++) f.controller.signIn('a@example.test', 'synthetic-only');
  assert.equal(f.calls.length, 2);
  assert.equal(f.controller.getSnapshot().kind, 'signingIn');
  assert.equal(JSON.stringify(f.controller.getSnapshot()).includes('synthetic-only'), false);
  f.calls[1].resolve({ user: { ...user, role } }); await tick();
  assert.equal(f.controller.getSnapshot().user.role, role);
  f.controller.stop();
});
for (const [status, code, error] of [[400, 'INVALID_INPUT', 'input'], [401, 'INVALID_CREDENTIALS', 'credentials']]) {
  test(`US1: rejected login ${code} clears pending state without protected data`, async () => {
    const f = fixture(); await f.signedOut(); f.controller.signIn('a', 'b');
    f.calls[1].resolve({ code }, status); await tick();
    assert.equal(f.controller.getSnapshot().error, error);
    assert.equal('user' in f.controller.getSnapshot(), false); f.controller.stop();
  });
}
for (const outcome of ['valid', 'absent', 'failed']) test(`US1: uncertain login reconciles ${outcome} before another attempt`, async () => {
  const f = fixture(); await f.signedOut(); f.controller.signIn('a', 'synthetic-only');
  f.calls[1].reject(Error('network')); await tick();
  assert.equal(f.calls[2].url, '/api/auth/get-session');
  f.controller.signIn('a', 'synthetic-only'); assert.equal(f.calls.length, 3);
  if (outcome === 'valid') f.calls[2].resolve(session());
  else if (outcome === 'absent') f.calls[2].resolve({ code: 'UNAUTHENTICATED' }, 401);
  else f.calls[2].reject(Error('network'));
  await tick();
  assert.equal(f.controller.getSnapshot().kind, { valid: 'authenticated', absent: 'signedOut', failed: 'checkUnavailable' }[outcome]);
  assert.equal(JSON.stringify(f.controller.getSnapshot()).includes('synthetic-only'), false); f.controller.stop();
});
test('US1: timeout locks until transport settles; obsolete login cannot reopen a new generation', async () => {
  const f = fixture(); await f.signedOut(); f.controller.signIn('a', 'b');
  [...f.timers.values()][0]();
  assert.equal(f.calls[1].signal.aborted, true);
  f.controller.signIn('a', 'b'); assert.equal(f.calls.length, 2);
  f.calls[1].resolve({ user }); await tick();
  assert.equal(f.calls[2].url, '/api/auth/get-session');
  f.controller.stop(); f.calls[2].resolve(session()); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'checking');
});

test('US2: initial absence, unavailable and explicit retry are distinct', async () => {
  const f = fixture(); assert.equal(f.controller.getSnapshot().kind, 'checking');
  f.calls[0].reject(Error('network')); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'checkUnavailable');
  assert.equal('user' in f.controller.getSnapshot(), false);
  f.controller.retry(); assert.equal(f.calls.length, 2);
  await f.signedOut(); assert.equal(f.controller.getSnapshot().reason, 'absent'); f.controller.stop();
});
test('US2 C1: hiding removes identity synchronously; pageshow/visibility deduplicate without remount', async () => {
  const f = fixture(); await f.authenticated();
  f.controller.suspend();
  assert.equal(f.controller.getSnapshot().kind, 'checking');
  assert.equal('user' in f.controller.getSnapshot(), false);
  assert.equal(f.calls.length, 1);
  f.controller.suspend(); f.controller.resume(); f.controller.resume();
  assert.equal(f.calls.length, 2);
  assert.equal(f.controller.getSnapshot().kind, 'checking');
  await f.signedOut(); assert.equal(f.controller.getSnapshot().reason, 'lost'); f.controller.stop();
});
test('US2: StrictMode cleanup/restart serializes aborted reads and discards their result', async () => {
  const f = fixture(); let notifications = 0;
  const unsubscribe = f.controller.subscribe(() => notifications++);
  f.controller.stop(); f.controller.start(); f.controller.start();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].signal.aborted, true);
  f.calls[0].resolve(session()); await tick();
  assert.equal(f.calls.length, 2); assert.equal(f.controller.getSnapshot().kind, 'checking');
  f.calls[1].resolve(session('ADMIN')); await tick();
  assert.equal(f.controller.getSnapshot().user.role, 'ADMIN');
  unsubscribe(); const before = notifications; f.controller.stop(); assert.equal(notifications, before);
  assert.equal(f.timers.size, 0);
});
test('US2: suspension during a pending read ignores its late identity', async () => {
  const f = fixture(); f.controller.suspend(); f.calls[0].resolve(session()); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'checking');
  f.controller.resume(); assert.equal(f.calls.length, 2);
  f.calls[1].reject(Error('network')); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'checkUnavailable'); f.controller.stop();
});

for (const status of [200, 401]) test(`US3: close ${status} hides identity immediately, no duplicate close`, async () => {
  const f = fixture(); await f.authenticated();
  f.controller.signOut(); f.controller.signOut();
  assert.equal(f.controller.getSnapshot().kind, 'signingOut');
  assert.equal('user' in f.controller.getSnapshot(), false); assert.equal(f.calls.length, 2);
  f.calls[1].resolve(status === 200 ? { success: true } : { code: 'UNAUTHENTICATED' }, status); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'signedOut'); f.controller.stop();
});
for (const outcome of ['valid', 'absent', 'failed']) test(`US3: uncertain close retries only explicitly, reconciling ${outcome}`, async () => {
  const f = fixture(); await f.authenticated(); f.controller.signOut();
  f.calls[1].reject(Error('lost')); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'signOutUnconfirmed'); assert.equal(f.calls.length, 2);
  f.controller.retry(); assert.equal(f.calls[2].url, '/api/auth/get-session');
  if (outcome === 'valid') f.calls[2].resolve(session());
  else if (outcome === 'absent') f.calls[2].resolve({ code: 'UNAUTHENTICATED' }, 401);
  else f.calls[2].reject(Error('network'));
  await tick(); assert.equal('user' in f.controller.getSnapshot(), false);
  if (outcome === 'valid') {
    assert.equal(f.calls[3].url, '/api/auth/sign-out');
    f.calls[3].resolve({ success: true }); await tick();
    assert.equal(f.controller.getSnapshot().reason, 'closed');
  } else assert.equal(f.controller.getSnapshot().kind, outcome === 'absent' ? 'signedOut' : 'signOutUnconfirmed');
  f.controller.stop();
});
test('US3 C1: close intent survives suspension, timeout and stale success', async () => {
  const f = fixture(); await f.authenticated(); f.controller.signOut();
  [...f.timers.values()][0](); assert.equal(f.controller.getSnapshot().kind, 'signOutUnconfirmed');
  f.controller.suspend(); f.controller.resume(); f.controller.resume();
  f.calls[1].resolve({ success: true }); await tick();
  assert.equal(f.calls.length, 3); assert.equal(f.controller.getSnapshot().kind, 'checking');
  f.calls[2].resolve(session()); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'signingOut');
  assert.equal('user' in f.controller.getSnapshot(), false);
  f.calls[3].reject(Error('lost')); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'signOutUnconfirmed'); f.controller.stop();
});
for (const outcome of ['valid', 'absent', 'failed']) test(`US4: forbidden rechecks ${outcome}, no business request or replay`, async () => {
  const f = fixture(); await f.authenticated();
  f.controller.notify({ generation: f.controller.getGeneration(), category: 'forbidden' });
  assert.equal(f.controller.getSnapshot().kind, 'checking'); assert.equal('user' in f.controller.getSnapshot(), false);
  assert.equal(f.calls[1].url, '/api/auth/get-session');
  if (outcome === 'valid') f.calls[1].resolve(session());
  else if (outcome === 'absent') f.calls[1].resolve({ code: 'UNAUTHENTICATED' }, 401);
  else f.calls[1].reject(Error('network'));
  await tick();
  assert.equal(f.controller.getSnapshot().kind, { valid: 'authenticated', absent: 'signedOut', failed: 'checkUnavailable' }[outcome]);
  if (outcome === 'valid') assert.equal(f.controller.getSnapshot().denied, true);
  assert.equal(f.calls.length, 2); f.controller.stop();
});
test('US4: obsolete denial ignored; current 401 invalidates an ongoing recheck', async () => {
  const f = fixture(); await f.authenticated();
  const old = f.controller.getGeneration();
  f.controller.suspend(); f.controller.resume();
  f.controller.notify({ generation: old, category: 'unauthenticated' });
  assert.equal(f.controller.getSnapshot().kind, 'checking');
  f.controller.notify({ generation: f.controller.getGeneration(), category: 'unauthenticated' });
  assert.equal(f.controller.getSnapshot().reason, 'lost');
  f.calls[1].resolve(session()); await tick(); assert.equal(f.controller.getSnapshot().kind, 'signedOut'); f.controller.stop();
});
test('US4: unavailable verification blocks and manual retry never replays a mutation', async () => {
  const f = fixture(); await f.authenticated();
  f.controller.notify({ generation: f.controller.getGeneration(), category: 'unavailable' });
  assert.equal(f.controller.getSnapshot().kind, 'checkUnavailable'); assert.equal(f.calls.length, 1);
  f.controller.retry(); f.calls[1].resolve(session()); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'authenticated'); assert.equal(f.calls.length, 2); f.controller.stop();
});
test('cleanup cancels timers immediately even when a transport ignores abort', async () => {
  const f = fixture();
  assert.equal(f.timers.size, 1);
  f.controller.stop();
  assert.equal(f.timers.size, 0);
  f.calls[0].resolve(session()); await tick();
  assert.equal(f.controller.getSnapshot().kind, 'checking');
});
