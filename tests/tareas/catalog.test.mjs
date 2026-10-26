import test from 'node:test';
import assert from 'node:assert/strict';
import { createTasksApi } from '../../src/features/tareas/api.ts';
import { parseTaskDetail, parseTaskPage, parseTask } from '../../src/features/tareas/types.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import { resolveRoute, canConsultTasks } from '../../src/features/usuarios/navigation.ts';

const task = { id: 'TG-01', title: 'Lluvia de estrellas', description: 'Ficha metodológica', isEnabled: false,
  integrationReady: false, publishedVersion: null, assignable: false,
  unavailableReasons: ['INTEGRATION_PENDING', 'CONFIGURATION_UNPUBLISHED', 'TASK_DISABLED'], revision: 1 };
const detail = { ...task, purpose: 'Observación pedagógica', pedagogicalNotice: 'No diagnóstico' };
const signal = () => new AbortController().signal;
function fixture(status, data) {
  const calls = [], denials = [];
  const api = createTasksApi(createHttpClient('http://localhost:3000', { getGeneration: () => 1, notify: (denial) => denials.push(denial) }, async (url, init) => {
    calls.push({ url, init }); return Response.json(data, { status });
  }));
  return { api, calls, denials };
}
test('list/detail use only cookie GET/no-store and exact API, filtering extra fields', async () => {
  const list = fixture(200, { items: [{ ...task, secret: 'discard' }] });
  assert.deepEqual(await list.api.list(signal()), { kind: 'success', data: { items: [task] } });
  assert.equal(list.calls[0].url, 'http://localhost:3000/api/v1/tasks');
  const f = fixture(200, { ...detail, bank: 'discard', r2Key: 'discard' });
  assert.deepEqual(await f.api.detail('TG-01', signal()), { kind: 'success', data: detail });
  assert.equal(f.calls[0].url, 'http://localhost:3000/api/v1/tasks/TG-01');
  assert.equal(f.calls[0].init.method, 'GET');
  assert.equal(f.calls[0].init.body, undefined);
  assert.equal(f.calls[0].init.credentials, 'include');
  assert.equal(f.calls[0].init.cache, 'no-store');
});
test('empty is valid; malformed or duplicate rows and unknown reason codes fail closed', () => {
  assert.deepEqual(parseTaskPage({ items: [] }), { items: [] });
  for (const value of [{}, { items: [task, {}] }, { items: [task, task] }]) assert.equal(parseTaskPage(value), undefined);
  for (const change of [{ publishedVersion: undefined }, { revision: 0 }, { assignable: 'yes' },
    { unavailableReasons: ['UNKNOWN'] }, { publishedVersion: { id: 'invalid', version: 1 } }]) assert.equal(parseTask({ ...task, ...change }), undefined);
  assert.equal(parseTaskDetail(task), undefined);
  assert.deepEqual(parseTaskDetail(detail), detail);
});
test('published version and assignable are taken from server, never inferred from administrative availability', () => {
  const value = { ...task, isEnabled: true };
  assert.equal(parseTask(value).assignable, false);
  const ready = { ...detail, integrationReady: true, isEnabled: true, assignable: true, unavailableReasons: [],
    publishedVersion: { id: '12345678-1234-1234-1234-123456789abc', version: 2 } };
  assert.deepEqual(parseTaskDetail(ready), ready);
});
for (const [status, code] of [[400, 'INVALID_INPUT'], [401, 'UNAUTHENTICATED'], [403, 'FORBIDDEN'], [404, 'NOT_FOUND'], [503, 'UNAVAILABLE']]) {
  test(`HTTP ${status} is distinct, safe and never automatically repeated`, async () => {
    const f = fixture(status, { code, message: 'SQL/exception must not be displayed' });
    const result = await f.api.detail('TG-01', signal());
    assert.equal(result.kind, 'error'); assert.equal(result.status, status); assert.equal(result.code, code);
    assert.equal(result.message, undefined); assert.equal(f.calls.length, 1);
    assert.equal(f.denials.length, [401, 403, 503].includes(status) ? 1 : 0);
  });
}
test('malformed ID does not hit transport or accidentally decode a list as detail', async () => {
  const f = fixture(200, detail);
  for (const id of ['', '../', 'TG-01/extra', '%ZZ']) assert.equal((await f.api.detail(id, signal())).status, 400);
  assert.equal(f.calls.length, 0);
  assert.equal((await fixture(200, { ...detail, id: 'TG-99' }).api.detail('TG-01', signal())).kind, 'unavailable');
});
test('late response from a previous access generation is obsolete and cannot notify the new session', async () => {
  let generation = 1, resolve;
  const notices = [];
  const api = createTasksApi(createHttpClient('http://localhost:3000', { getGeneration: () => generation, notify: value => notices.push(value) }, () => new Promise(done => { resolve = done; })));
  const pending = api.list(signal());
  generation++;
  resolve(Response.json({ items: [task] }));
  assert.deepEqual(await pending, { kind: 'obsolete' });
  assert.deepEqual(notices, []);
});
test('task URL routes include unknown detail; only confirmed non-denied access can consult', () => {
  assert.deepEqual(resolveRoute('/tareas', ''), { kind: 'tasks' });
  assert.deepEqual(resolveRoute('/tareas/TG-01', ''), { kind: 'taskDetail', taskId: 'TG-01' });
  assert.deepEqual(resolveRoute('/tareas/unknown', ''), { kind: 'taskDetail', taskId: 'unknown' });
  assert.equal(resolveRoute('/tareas', '?token=private').kind, 'blockedLink');
  for (const role of ['TEACHER', 'ADMIN']) {
    assert.equal(canConsultTasks({ kind: 'authenticated', user: { role }, denied: false }), true);
    assert.equal(canConsultTasks({ kind: 'authenticated', user: { role }, denied: true }), false);
  }
  assert.equal(canConsultTasks({ kind: 'checking' }), false);
});
