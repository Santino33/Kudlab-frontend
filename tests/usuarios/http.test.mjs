import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttpClient, validateApiOrigin } from '../../src/lib/http.ts';

const signal = () => new AbortController().signal;
const context = () => {
  let generation = 4;
  const notices = [];
  return { notices, change: () => generation++, access: {
    getGeneration: () => generation,
    notify: (denial) => notices.push(denial),
  } };
};
const decode = (data) => data?.success === true ? { success: true } : undefined;

test('origin must be an explicit public HTTP(S) origin without credentials, path, query or fragment', () => {
  for (const origin of [undefined, '', '/api', 'ftp://localhost', 'https://user:pass@example.com',
    'https://example.com/path', 'https://example.com/?token=secret', 'https://example.com/#x', 'null']) {
    assert.throws(() => validateApiOrigin(origin));
  }
  assert.equal(validateApiOrigin('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(validateApiOrigin('https://api.example.com'), 'https://api.example.com');
});

test('business transport uses include, no-store, redirect:error, JSON and no replay', async () => {
  const ctx = context();
  const calls = [];
  const client = createHttpClient('http://localhost:3000', ctx.access, async (url, init) => {
    calls.push({ url, init });
    return Response.json({ success: true, token: 'not retained' });
  });
  const result = await client.request('/api/v1/accounts', { method: 'POST', body: { name: 'Ejemplo' }, signal: signal(), decode });
  assert.deepEqual(result, { kind: 'success', data: { success: true } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:3000/api/v1/accounts');
  assert.equal(calls[0].init.credentials, 'include');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: 'Ejemplo' });
  assert.equal('Authorization' in calls[0].init.headers, false);
});

test('GET sends no body; refuses paths outside business API before transport', async () => {
  let calls = 0;
  const client = createHttpClient('http://localhost:3000', context().access, async (_url, init) => {
    calls++;
    assert.equal(init.body, undefined);
    return Response.json({ success: true });
  });
  await client.request('/api/v1/accounts', { signal: signal(), decode });
  for (const path of ['https://other.example/api/v1/accounts', '//other.example', '/api/auth/token', '/api/v1/../auth/token']) {
    assert.equal((await client.request(path, { signal: signal(), decode })).kind, 'unavailable');
  }
  assert.equal(calls, 1);
});

for (const [status, category] of [[401, 'unauthenticated'], [403, 'forbidden'], [503, 'unavailable']]) {
  test(`current ${status} notifies original generation; mutation stays uncertain`, async () => {
    const ctx = context();
    let calls = 0;
    const client = createHttpClient('http://localhost:3000', ctx.access, async () => {
      calls++;
      return Response.json({ code: 'SECRET_CODE', message: 'sensitive body' }, { status });
    });
    const result = await client.request('/api/v1/accounts', { method: 'POST', body: {}, signal: signal(), decode });
    assert.equal(result.kind, 'error');
    assert.equal(result.uncertain, true);
    assert.deepEqual(ctx.notices, [{ generation: 4, category }]);
    assert.equal(JSON.stringify(result).includes('sensitive'), false);
    assert.equal(JSON.stringify(result).includes('SECRET_CODE'), false);
    assert.equal(calls, 1);
  });
}

test('obsolete successful response and denial are discarded without notification', async () => {
  for (const status of [200, 401, 403, 503]) {
    const ctx = context();
    const client = createHttpClient('http://localhost:3000', ctx.access, async () => {
      ctx.change();
      return Response.json({ success: true }, { status });
    });
    assert.deepEqual(await client.request('/api/v1/accounts', { signal: signal(), decode }), { kind: 'obsolete' });
    assert.deepEqual(ctx.notices, []);
  }
});

test('invalid JSON, malformed success, redirection and network/abort never report mutation rollback', async () => {
  for (const respond of [() => new Response('not JSON'), () => Response.json({ unexpected: true }),
    () => new Response('', { status: 302 }), () => { throw new TypeError('secret'); },
    () => { throw new DOMException('secret', 'AbortError'); }]) {
    let calls = 0;
    const client = createHttpClient('http://localhost:3000', context().access, async () => { calls++; return respond(); });
    const result = await client.request('/api/v1/accounts', { method: 'PATCH', body: {}, signal: signal(), decode });
    assert.equal(result.kind === 'error' || result.kind === 'unavailable', true);
    assert.equal(result.uncertain, true);
    assert.equal(JSON.stringify(result).includes('secret'), false);
    assert.equal(calls, 1);
  }
});

test('400/404/409 preserve only known error codes, without claiming uncertain success', async () => {
  for (const [status, code] of [[400, 'INVALID_INPUT'], [404, 'NOT_FOUND'], [409, 'CONFLICT']]) {
    const client = createHttpClient('http://localhost:3000', context().access,
      async () => Response.json({ code, message: 'raw message', fields: [{ field: 'password', reason: 'secret' }] }, { status }));
    assert.deepEqual(await client.request('/api/v1/accounts', { method: 'POST', body: {}, signal: signal(), decode }),
      { kind: 'error', status, code, uncertain: false });
  }
});

test('a fake redirect or wrong content type cannot bypass response validation', async () => {
  for (const response of [new Response('{"success":true}', { headers: { 'Content-Type': 'text/html' } }),
    Object.defineProperty(Response.json({ success: true }), 'redirected', { value: true })]) {
    const ctx = context();
    const client = createHttpClient('http://localhost:3000', ctx.access, async () => response);
    assert.deepEqual(await client.request('/api/v1/accounts', { signal: signal(), decode }), { kind: 'unavailable', uncertain: false });
    assert.deepEqual(ctx.notices, [{ generation: 4, category: 'unavailable' }]);
  }
});

test('aborted transport cannot restore data even if fetch ignores the signal', async () => {
  const abort = new AbortController();
  const ctx = context();
  const client = createHttpClient('http://localhost:3000', ctx.access, async () => {
    abort.abort();
    return Response.json({ success: true });
  });
  assert.deepEqual(await client.request('/api/v1/accounts', { signal: abort.signal, decode }), { kind: 'unavailable', uncertain: false });
  assert.deepEqual(ctx.notices, []);
});

test('uncertainty is retained before auth invalidation, without carrying account data', async () => {
  const events = [];
  const client = createHttpClient('http://localhost:3000', {getGeneration:()=>4,notify:()=>events.push('withdraw')},
    async()=>Response.json({code:'UNAUTHENTICATED'},{status:401}), ()=>events.push('uncertain'));
  await client.request('/api/v1/accounts', {method:'POST',body:{},signal:signal(),decode});
  assert.deepEqual(events,['uncertain','withdraw']);
});
test('only documented fixed field reasons escape the HTTP boundary', async () => {
  const client=createHttpClient('http://localhost:3000',context().access,async()=>Response.json({code:'INVALID_INPUT', fields:[
    {field:'email',reason:'Ingrese un correo institucional válido terminado en .edu.co'},
    {field:'name',reason:'untrusted-secret'}, {field:'token',reason:'untrusted-secret'}]}, {status:400}));
  const result=await client.request('/api/v1/accounts',{method:'POST',body:{},signal:signal(),decode});
  assert.deepEqual(result.fields,[{field:'email',reason:'Ingrese un correo institucional válido terminado en .edu.co'}]);
  assert.equal(JSON.stringify(result).includes('untrusted-secret'),false);
});
