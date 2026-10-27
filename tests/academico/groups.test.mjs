import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupsApi } from '../../src/features/academico/groups/api.ts';
import { parseGroup, parseGroups, parseTeachers, groupIssues } from '../../src/features/academico/groups/types.ts';
import { createStudentsApi } from '../../src/features/academico/students/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';
const group = { id: '00000000-0000-4000-8000-000000000010', teacherId: '00000000-0000-4000-8000-000000000011', name: 'Curso de prueba', grade: '3', schoolYear: 2026, teacherName: 'Profesor ficticio' };
const student = { id: '00000000-0000-4000-8000-000000000001', groupId: group.id, studentCode: '0001', firstName: 'Nombre ficticio', lastName: 'De prueba', isActive: false };
const signal = () => new AbortController().signal;
function fixture(data, status = 200) {
  const calls = [], writes = [];
  const http = createHttpClient('http://localhost:3000', { getGeneration: () => 1, notify() {} }, async (url, init) => { calls.push({ url, init }); return Response.json(data, { status }); });
  return { api: createGroupsApi(http, state => writes.push(state)), students: createStudentsApi(http, () => {}, group.id), calls, writes };
}
test('group DTOs are safe, reject duplicate/invalid records and preserve empty lists', () => {
  assert.deepEqual(parseGroup({ ...group, secret: 'discard' }), group);
  assert.equal(parseGroup({ ...group, schoolYear: '2026' }), undefined);
  assert.equal(parseGroup({ ...group, teacherId: 'auth-id' }), undefined);
  assert.equal(parseGroups({ items: [group, group] }), undefined);
  assert.deepEqual(parseGroups({ items: [] }), { items: [] });
  assert.deepEqual(parseTeachers({ items: [{ id: group.teacherId, name: group.teacherName, email: 'discard' }] }), { items: [{ id: group.teacherId, name: group.teacherName }] });
  assert.equal(parseTeachers({ items: [{ id: 'bad', name: 'x' }] }), undefined);
  assert.deepEqual(groupIssues(group), {});
  assert.ok(groupIssues({ ...group, name: ' ', grade: 'x'.repeat(21), teacherId: '', schoolYear: NaN }).schoolYear);
});
test('group routes preserve course context without granting permission', () => {
  const base = `/academico/cursos/${group.id}`;
  assert.deepEqual(resolveRoute('/academico/cursos', ''), { kind: 'groups' });
  assert.deepEqual(resolveRoute('/academico/cursos/nuevo', ''), { kind: 'groupNew' });
  assert.deepEqual(resolveRoute(base, ''), { kind: 'groupDetail', groupId: group.id });
  assert.deepEqual(resolveRoute(`${base}/editar`, ''), { kind: 'groupEdit', groupId: group.id });
  assert.deepEqual(resolveRoute(`${base}/estudiantes/nuevo`, ''), { kind: 'studentNew', groupId: group.id });
  assert.deepEqual(resolveRoute(`${base}/estudiantes/${student.id}/editar`, ''), { kind: 'studentEdit', groupId: group.id, studentId: student.id });
  assert.deepEqual(resolveRoute(`${base}/estudiantes/${student.id}`, '?token=synthetic'), { kind: 'blockedLink' });
});
test('group creation sends only allowed normalized fields, never credentials or privileges', async () => {
  const f = fixture(group, 201);
  assert.equal((await f.api.save({ ...group, name: ' Curso de prueba ', role: 'ADMIN' }, signal())).kind, 'success');
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { name: 'Curso de prueba', grade: '3', schoolYear: 2026, teacherId: group.teacherId });
  assert.deepEqual(f.writes, [{ id: undefined, phase: 'pending' }, undefined]);
});
test('edit sends only changes and explicit transfer confirmation; delete is zero-byte and confirmed', async () => {
  const next = { ...group, teacherId: '00000000-0000-4000-8000-000000000012' };
  const f = fixture(next);
  assert.equal((await f.api.save(next, signal(), group, true)).kind, 'success');
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { teacherId: next.teacherId, confirmTransfer: true });
  const deleted = fixture({ id: group.id, deleted: true });
  assert.equal((await deleted.api.delete(group.id, signal())).kind, 'success');
  assert.equal(deleted.calls[0].init.method, 'DELETE'); assert.equal(deleted.calls[0].init.body, undefined);
  assert.equal(new Request(deleted.calls[0].url, deleted.calls[0].init).body, null);
  const bad = fixture({ id: group.id, deleted: false });
  assert.equal((await bad.api.delete(group.id, signal())).kind, 'unavailable');
  assert.equal(bad.calls.length, 1); assert.equal(bad.writes.at(-1).phase, 'uncertain');
});
test('no empty edit, malformed ID request or mismatched returned identity can announce success', async () => {
  const f = fixture(group);
  assert.equal((await f.api.save(group, signal(), group)).kind, 'error');
  assert.equal((await f.api.detail('bad', signal())).kind, 'error');
  assert.equal((await f.api.delete('bad', signal())).kind, 'error');
  assert.equal(f.calls.length, 0);
  const other = fixture({ ...group, id: '00000000-0000-4000-8000-000000000099' });
  assert.equal((await other.api.detail(group.id, signal())).kind, 'unavailable');
});
test('student list is scoped on server and individual DTO/write context cannot cross courses', async () => {
  const f = fixture({ items: [student] });
  assert.equal((await f.students.list(signal())).kind, 'success');
  assert.equal(f.calls[0].url, `http://localhost:3000/api/v1/groups/${group.id}/students`);
  const foreign = { ...student, groupId: '00000000-0000-4000-8000-000000000099' };
  const detail = fixture(foreign);
  assert.equal((await detail.students.detail(student.id, signal())).status, 404);
  await detail.students.create(foreign, signal()); await detail.students.update(foreign, { firstName: 'Cambio' }, signal()); await detail.students.deactivate(foreign, signal());
  assert.equal(detail.calls.length, 1, 'no cross-context mutation requests');
  const list = fixture({ items: [foreign] });
  assert.equal((await list.students.list(signal())).kind, 'unavailable');
});
for (const status of [400, 401, 403, 404, 409, 503]) test(`group mutation ${status} is never replayed`, async () => {
  const f = fixture({ code: status === 409 ? 'CONFLICT' : 'INVALID_INPUT', fields: { name: '<unsafe>' } }, status);
  const result = await f.api.save(group, signal());
  assert.equal(result.kind, 'error'); assert.equal(f.calls.length, 1); assert.deepEqual(result.fields, undefined);
});
