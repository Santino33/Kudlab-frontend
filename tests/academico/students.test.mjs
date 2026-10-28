import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudentsApi } from '../../src/features/academico/students/api.ts';
import { parseStudent, parseStudents, studentChanges, studentIssues } from '../../src/features/academico/students/types.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import { resolveRoute, canManageStudents } from '../../src/features/usuarios/navigation.ts';

const student = { id: '00000000-0000-4000-8000-000000000001', groupId: '00000000-0000-4000-8000-000000000002', studentCode: '0001-Á', firstName: 'Nombre ficticio', lastName: 'Apellido de prueba', isActive: true };
const signal = () => new AbortController().signal;
function fixture(status, data) {
  const calls = [], denials = [];
  const api = createStudentsApi(createHttpClient('http://localhost:3000', { getGeneration: () => 1, notify: (value) => denials.push(value) }, async (url, init) => {
    calls.push({ url, init }); return Response.json(data, { status });
  }));
  return { api, calls, denials };
}
test('five exact routes, statuses, safe DTO and zero-byte deactivation', async () => {
  const list = fixture(200, { items: [student] });
  assert.equal((await list.api.list(signal())).kind, 'success');
  assert.equal(list.calls[0].url, 'http://localhost:3000/api/v1/students');
  const detail = fixture(200, student);
  assert.equal((await detail.api.detail(student.id, signal())).kind, 'success');
  const create = fixture(201, { ...student, isActive: false });
  assert.equal((await create.api.create({ ...student, studentCode: ' 0001-Á ' }, signal())).kind, 'success');
  assert.deepEqual(JSON.parse(create.calls[0].init.body), { groupId: student.groupId, studentCode: student.studentCode, firstName: student.firstName, lastName: student.lastName });
  const edit = fixture(200, { ...student, firstName: 'Otro nombre' });
  assert.equal((await edit.api.update(student, { firstName: ' Otro nombre ', groupId: 'forbidden', isActive: false }, signal())).kind, 'success');
  assert.equal(edit.calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(edit.calls[0].init.body), { firstName: 'Otro nombre' });
  const deactivate = fixture(200, { ...student, isActive: false });
  assert.equal((await deactivate.api.deactivate(student, signal())).kind, 'success');
  assert.equal(deactivate.calls[0].url, `http://localhost:3000/api/v1/students/${student.id}/deactivate`);
  assert.equal(deactivate.calls[0].init.method, 'POST');
  assert.equal(deactivate.calls[0].init.body, undefined);
  assert.equal(new Request(deactivate.calls[0].url, deactivate.calls[0].init).body, null);
  for (const { init, url } of [...list.calls, ...detail.calls, ...create.calls, ...edit.calls, ...deactivate.calls]) {
    assert.equal(new URL(url).search, '');
    assert.equal(init.credentials, 'include'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
  }
});
test('creation accepts the server-confirmed active preview state without sending a state or consent field', async () => {
  for (const isActive of [true, false]) {
    const f = fixture(201, { ...student, isActive });
    const result = await f.api.create({ ...student, isActive: true, consent: true }, signal());
    assert.equal(result.kind, 'success'); assert.equal(result.data.isActive, isActive);
    assert.deepEqual(Object.keys(JSON.parse(f.calls[0].init.body)).sort(), ['firstName', 'groupId', 'lastName', 'studentCode']);
  }
});
test('malformed DTOs, wrong identity/state/values and wrong status cannot confirm mutations', async () => {
  for (const change of [{ id: 'wrong' }, { isActive: 1 }, { firstName: '' }, { extra: true }, { studentCode: 'x\0' }]) assert.equal(parseStudent({ ...student, ...change }), undefined);
  assert.deepEqual(parseStudents({ items: [] }), { items: [] });
  for (const data of [{}, { items: [student, {}] }, { items: [student, student] }]) assert.equal(parseStudents(data), undefined);
  const other = { ...student, id: student.groupId };
  assert.equal((await fixture(200, other).api.detail(student.id, signal())).kind, 'unavailable');
  for (const data of [other, { ...student, groupId: student.id }, { ...student, firstName: 'wrong' }, { ...student, isActive: false }]) {
    assert.equal((await fixture(200, data).api.update(student, { firstName: student.firstName }, signal())).kind, 'unavailable');
  }
  assert.equal((await fixture(200, student).api.deactivate(student, signal())).uncertain, true);
  assert.equal((await fixture(200, { ...student, isActive: false }).api.create(student, signal())).kind, 'unavailable');
});
test('Unicode points, trim, NUL, case and leading zero preservation', () => {
  for (const field of ['studentCode', 'firstName', 'lastName']) {
    const limit = field === 'studentCode' ? 50 : 100;
    assert.equal(studentIssues({ ...student, [field]: '😀'.repeat(limit) })[field], undefined);
    for (const value of ['😀'.repeat(limit + 1), ' ', 'x\0']) assert.ok(studentIssues({ ...student, [field]: value })[field]);
  }
  assert.deepEqual(studentChanges(student, { ...student, firstName: ` ${student.firstName} ` }), {});
  assert.deepEqual(studentChanges(student, { ...student, studentCode: ' 0001-á ' }), { studentCode: '0001-á' });
});
test('academic object errors are allowlisted, localized, never raw response text', async () => {
  const f = fixture(400, { code: 'INVALID_INPUT', message: '<unsafe>', fields: { firstName: 'required', studentCode: 'too_long', lastName: '<unsafe>', email: 'required' } });
  const result = await f.api.update(student, { firstName: 'Cambio' }, signal());
  assert.deepEqual(result.fields, [{ field: 'studentCode', reason: 'El texto supera el límite permitido.' }, { field: 'firstName', reason: 'Completa este campo.' }]);
  assert.equal(result.message, undefined);
});
for (const [status, code] of [[400, 'INVALID_INPUT'], [401, 'UNAUTHENTICATED'], [403, 'FORBIDDEN'], [404, 'NOT_FOUND'], [409, 'CONFLICT'], [503, 'UNAVAILABLE']]) {
  test(`${status} is safe, distinct, notified where needed and never replayed`, async () => {
    const f = fixture(status, { code, message: 'Private information' });
    const result = await f.api.deactivate(student, signal());
    assert.equal(result.status, status); assert.equal(result.code, code); assert.equal(result.message, undefined);
    assert.equal(f.calls.length, 1); assert.equal(f.denials.length, [401, 403, 503].includes(status) ? 1 : 0);
  });
}
test('invalid paths have neutral 404 and empty patches never send requests', async () => {
  const f = fixture(200, student);
  for (const id of ['', '../', 'malformed']) assert.equal((await f.api.detail(id, signal())).status, 404);
  assert.equal((await f.api.update(student, {}, signal())).status, 400);
  assert.equal(f.calls.length, 0);
});
test('late generations and aborted mutations cannot produce success or replay', async () => {
  let generation = 1, finish;
  const notifications = [], calls = [];
  const api = createStudentsApi(createHttpClient('http://localhost:3000', { getGeneration: () => generation, notify: (value) => notifications.push(value) }, (...args) => {
    calls.push(args); return new Promise(resolve => { finish = resolve; });
  }));
  const pending = api.detail(student.id, signal()); generation++;
  finish(Response.json(student)); assert.deepEqual(await pending, { kind: 'obsolete' });
  const abort = new AbortController();
  const write = api.deactivate(student, abort.signal); abort.abort();
  finish(Response.json({ ...student, isActive: false }));
  assert.deepEqual(await write, { kind: 'unavailable', uncertain: true });
  assert.equal(calls.length, 2); assert.deepEqual(notifications, []);
});
test('finite academic routes preserve neutral unknown IDs and require active non-denied TEACHER', () => {
  assert.deepEqual(resolveRoute('/academico/estudiantes', ''), { kind: 'students' });
  assert.deepEqual(resolveRoute('/academico/estudiantes/nuevo', ''), { kind: 'studentNew' });
  assert.deepEqual(resolveRoute(`/academico/estudiantes/${student.id}`, ''), { kind: 'studentDetail', studentId: student.id });
  assert.deepEqual(resolveRoute('/academico/estudiantes/%ZZ/editar', ''), { kind: 'studentEdit', studentId: '' });
  assert.equal(resolveRoute('/academico/estudiantes', '?token=private').kind, 'blockedLink');
  for (const state of [{ kind: 'checking' }, { kind: 'signedOut' }, { kind: 'authenticated', denied: true, user: { role: 'TEACHER' } }, { kind: 'authenticated', denied: false, user: { role: 'ADMIN' } }]) assert.equal(canManageStudents(state), false);
  assert.equal(canManageStudents({ kind: 'authenticated', denied: false, user: { role: 'TEACHER' } }), true);
});
test('an interrupted write keeps only nonpersonal uncertainty across generations', async () => {
  const states = [];
  let generation = 1, finish;
  const api = createStudentsApi(createHttpClient('http://localhost:3000', { getGeneration: () => generation, notify() {} }, () => new Promise(resolve => { finish = resolve; })), (state) => states.push(state));
  const pending = api.update(student, { firstName: 'Cambio' }, signal());
  assert.deepEqual(states, [{ id: student.id, phase: 'pending' }]);
  generation++;
  finish(Response.json({ ...student, firstName: 'Cambio' })); await pending;
  assert.deepEqual(states[1], { id: student.id, phase: 'uncertain' });
  assert.ok(!JSON.stringify(states).includes('Cambio'));
});
