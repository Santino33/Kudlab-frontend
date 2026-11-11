import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../../functions/api/[[path]].js';

const teacher = 'https://kudlab-docente.pages.dev';
const upstream = 'https://upstream.example';
const env = { VITE_API_ORIGIN: teacher, API_UPSTREAM_ORIGIN: upstream };
const call = (path, init = {}, bindings = env) => onRequest({ request: new Request(teacher + path, init), env: bindings });
const consentPath = '/api/v1/students/11111111-1111-4111-8111-111111111111/consents';

test('only exact consent POST receives 110 seconds, after route and origin checks', async t => {
  const budgets = [];
  t.mock.method(AbortSignal, 'timeout', ms => { budgets.push(ms); return new AbortController().signal; });
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  for (const [path, method, budget] of [
    [consentPath, 'POST', 110000], [consentPath, 'GET', 30000], [consentPath, 'DELETE', 30000],
    [consentPath + '/revocations', 'POST', 30000], [consentPath + '/', 'POST', 30000],
    ['/api/v1/students/not-a-uuid/consents', 'POST', 30000], ['/api/upload', 'POST', 30000],
  ]) {
    await call(path, { method, headers: { Origin: teacher } });
    assert.equal(budgets.at(-1), budget);
  }
  const before = budgets.length;
  assert.equal((await call(consentPath, { method: 'POST' })).status, 403);
  assert.equal((await call(consentPath.replace('/consents', '%2fconsents'), { method: 'POST', headers: { Origin: teacher } })).status, 404);
  assert.equal(budgets.length, before);
});

test('consent upload survives 31 seconds; deadline and client abort stay uncertain without retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(AbortSignal, 'timeout', ms => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('deadline', 'TimeoutError')), ms);
    return controller.signal;
  });
  const fetch = t.mock.method(globalThis, 'fetch', async request => {
    t.mock.timers.tick(31000);
    assert.equal(request.signal.aborted, false);
    return new Response('{}', { status: 201 });
  });
  const init = { method: 'POST', headers: { Origin: teacher } };
  assert.equal((await call(consentPath, init)).status, 201);
  fetch.mock.mockImplementation(async request => {
    t.mock.timers.tick(110000);
    request.signal.throwIfAborted();
    throw Error('deadline did not abort');
  });
  assert.equal((await call(consentPath, init)).status, 503);
  const controller = new AbortController();
  fetch.mock.mockImplementation(async request => {
    controller.abort();
    request.signal.throwIfAborted();
    throw Error('client abort not propagated');
  });
  assert.equal((await call(consentPath, { ...init, signal: controller.signal })).status, 503);
  assert.equal(fetch.mock.callCount(), 3);
});

test('fixed upstream, body streaming, headers and independent Set-Cookie survive', async t => {
  const cookies = ['session=synthetic; Path=/; Secure; HttpOnly; SameSite=Lax', 'old=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly'];
  let seen;
  t.mock.method(globalThis, 'fetch', async request => {
    seen = request;
    assert.equal(await request.text(), 'synthetic body');
    return new Response(new Uint8Array([0, 255, 12]), { status: 201, headers: [
      ['Content-Type', 'application/octet-stream'], ...cookies.map(c => ['Set-Cookie', c]),
      ['Cache-Control', 'public, max-age=3600'], ['Connection', 'x-hop'], ['x-hop', 'remove'],
    ] });
  });
  const response = await call('/api/v1/upload?next=https://evil.example', { method: 'POST', body: 'synthetic body', headers: {
    Origin: teacher, Cookie: 'session=synthetic', 'Content-Type': 'text/plain',
    Forwarded: 'host=evil.example', 'X-Forwarded-Host': 'evil.example', Host: 'evil.example',
  } });
  assert.equal(seen.url, upstream + '/api/v1/upload?next=https://evil.example');
  assert.equal(seen.method, 'POST');
  assert.equal(seen.redirect, 'manual');
  assert.equal(seen.headers.get('origin'), teacher);
  assert.equal(seen.headers.get('cookie'), 'session=synthetic');
  for (const name of ['forwarded', 'x-forwarded-host', 'host']) assert.equal(seen.headers.get(name), null);
  assert.equal(response.status, 201);
  assert.deepEqual(response.headers.getSetCookie(), cookies);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-hop'), null);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([0, 255, 12]));
});

test('foreign/missing write Origin, invalid config and ambiguous paths fail without upstream calls', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw Error('must not call'); });
  for (const init of [{ headers: { Origin: 'https://evil.example' } }, { method: 'POST', body: '{}' }]) assert.equal((await call('/api/auth/sign-in/email', init)).status, 403);
  for (const path of ['/api', '/api//evil', '/api/a%2fb', '/api/%252e%252e/admin', '/acceso']) assert.equal((await call(path)).status, 404);
  for (const value of [undefined, 'http://upstream.example', upstream + '/path', 'https://user:pass@upstream.example', teacher]) {
    assert.equal((await call('/api/test', {}, { ...env, API_UPSTREAM_ORIGIN: value })).status, 503);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('multipart remains intact; redirects, errors and absence of retries are observable', async t => {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array([0, 1, 255])]), 'synthetic.bin');
  const fetch = t.mock.method(globalThis, 'fetch', async request => {
    const received = await request.formData();
    assert.deepEqual(new Uint8Array(await received.get('file').arrayBuffer()), new Uint8Array([0, 1, 255]));
    return new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example', 'Cache-Control': 'public' } });
  });
  const response = await call('/api/upload', { method: 'POST', headers: { Origin: teacher }, body: form });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://elsewhere.example');
  assert.equal(fetch.mock.callCount(), 1);
  for (const status of [401, 403, 404, 500, 503]) {
    fetch.mock.mockImplementation(async () => new Response('upstream error', { status }));
    const result = await call('/api/test');
    assert.equal(result.status, status);
    assert.equal(await result.text(), 'upstream error');
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
  fetch.mock.mockImplementation(async () => { throw new DOMException('synthetic timeout', 'TimeoutError'); });
  const before = fetch.mock.callCount();
  const result = await call('/api/test');
  assert.equal(result.status, 503);
  assert.equal(fetch.mock.callCount(), before + 1);
  assert.deepEqual(await result.json(), { code: 'UNAVAILABLE', message: 'Operación no confirmada' });
});
