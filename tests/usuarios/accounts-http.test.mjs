import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from '../../src/lib/http.ts';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';

const account = { id: 'business-id', name: 'Profesora', email: 'profesora@pilot.edu.co', role: 'TEACHER', status: 'PENDIENTE', createdAt: '2026-10-26T00:00:00Z' };
const signal = () => new AbortController().signal;
function fixture(status, body) {
  const calls = [];
  const http = createHttpClient('http://localhost:3002', { getGeneration: () => 1, notify() {} }, async (url, init) => {
    calls.push({ path: new URL(url).pathname + new URL(url).search, method: init.method, body: init.body && JSON.parse(init.body), credentials: init.credentials });
    return Response.json(body, { status });
  });
  return { calls, api: createUsuariosApi(http) };
}
test('list uses only status/limit/offset, detail encodes business ID', async () => {
  const f = fixture(200, { items: [account], total: 1, limit: 20, offset: 0 });
  assert.equal((await f.api.listAccounts(0, 'PENDIENTE', signal())).kind, 'success');
  assert.equal(f.calls[0].path, '/api/v1/accounts?limit=20&offset=0&status=PENDIENTE');
  const d = fixture(200, account);
  await d.api.getAccount('id con espacio', signal());
  assert.equal(d.calls[0].path, '/api/v1/accounts/id%20con%20espacio');
});
test('invite always sends TEACHER, no password or supplied privilege', async () => {
  const f = fixture(201, account);
  assert.equal((await f.api.createAccount({ name: account.name, email: account.email, role: 'ADMIN', password: 'discard' }, signal())).kind, 'success');
  assert.deepEqual(f.calls[0].body, { name: account.name, email: account.email, role: 'TEACHER' });
  assert.equal(f.calls[0].credentials, 'include');
});
test('edit, reissue, deactivate and demote have exact methods/bodies; never generic role mutation', async () => {
  const f = fixture(200, account);
  await f.api.updateAccount(account.id, { name: 'Nuevo' }, signal());
  await f.api.reissueInvitation(account, signal());
  await f.api.deactivateAccount(account.id, signal());
  await f.api.demoteAccount(account.id, signal());
  assert.deepEqual(f.calls.map(c => [c.method, c.body]), [['PATCH', { name: 'Nuevo' }], ['PATCH', { email: account.email }], ['POST', { confirm: true }], ['PUT', { role: 'TEACHER' }]]);
  assert.equal(f.calls[2].path, '/api/v1/accounts/business-id/deactivate');
  assert.equal(f.calls[3].path, '/api/v1/accounts/business-id/role');
});
for (const status of [400, 401, 403, 404, 409, 503]) test(`account mutation ${status} is not automatically repeated`, async () => {
  const f = fixture(status, { code: status === 503 ? 'DELIVERY_FAILED' : 'CONFLICT', message: 'untrusted' });
  const result = await f.api.createAccount(account, signal());
  assert.equal(result.kind, 'error');
  assert.equal(result.uncertain, [401, 403, 503].includes(status));
  assert.equal(f.calls.length, 1);
});
test('malformed or wrong-status success cannot announce an account creation', async () => {
  for (const [status, body] of [[201, {}], [200, account]]) {
    const f = fixture(status, body);
    assert.deepEqual(await f.api.createAccount(account, signal()), { kind: 'unavailable', uncertain: true });
  }
});
test('public recovery requires 202 message or 200 success:true; no login or token inspection', async () => {
  const request = fixture(202, { message: 'Si corresponde, recibirás instrucciones en tu correo.' });
  assert.equal((await request.api.requestRecovery(account.email, signal())).kind, 'success');
  assert.deepEqual(request.calls[0].body, { email: account.email });
  const confirm = fixture(200, { success: true });
  assert.equal((await confirm.api.confirmRecovery('synthetic-only', 'Valida123', signal())).kind, 'success');
  assert.deepEqual(confirm.calls[0].body, { token: 'synthetic-only', newPassword: 'Valida123' });
  assert.equal(confirm.calls.length, 1);
  assert.deepEqual(Object.keys(confirm.api).sort(), ['listAccounts','getAccount','createAccount','updateAccount','reissueInvitation','deactivateAccount','demoteAccount','requestRecovery','confirmRecovery'].sort());
});
