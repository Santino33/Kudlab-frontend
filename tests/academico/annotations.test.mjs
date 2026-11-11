import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnnotationsApi, localAnnotationsAccess } from '../../src/features/seguimiento/annotations/api.ts';
import { annotationMessages, annotationTextIssue, decodeAnnotationFields, parseAnnotation, parseAnnotationsList } from '../../src/features/seguimiento/annotations/types.ts';
import { parseAnnotationDraft } from '../../src/features/seguimiento/annotations/draft.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import { createStudentDraftHost } from '../../src/features/academico/students/student-drafts.ts';

const studentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const row = { id, studentId, text: 'Contexto ficticio', author: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Docente A' },
  createdAt: '2026-11-11T00:00:00.000Z', updatedAt: null, canEdit: true, canDelete: true };
const list = { studentId, isActive: true, canCreate: true, items: [row], nextCursor: null };
const signal = () => new AbortController().signal;
function fixture(status, data) {
  const calls = [], events = [];
  const http = createHttpClient('http://localhost:3000', localAnnotationsAccess({ getGeneration: () => 1, notify: e => events.push(e) }), async (url, options) => {
    calls.push({ url, options });
    if (data instanceof Error) throw data;
    return data instanceof Response ? data : Response.json(data, { status });
  });
  return { api: createAnnotationsApi(http), calls, events };
}

test('text boundaries preserve Unicode/whitespace without truncation (CA-02)', () => {
  for (const text of ['', '  ', '\t\u00a0\ufeff', 'a'.repeat(1001), '😀'.repeat(1001), '\0', '\ud800']) assert.ok(annotationTextIssue(text));
  for (const text of ['a'.repeat(1000), '😀'.repeat(1000), ' <script>texto</script>\n']) assert.equal(annotationTextIssue(text), undefined);
});
test('strict DTOs reject inconsistent state and foreign/duplicate records', () => {
  assert.deepEqual(parseAnnotation(row), row); assert.deepEqual(parseAnnotationsList(list), list);
  for (const changed of [{ extra: 1 }, { createdAt: '2026-02-30T00:00:00.000Z' }, { canDelete: false }, { text: '' }, { author: { ...row.author, email: 'private' } }])
    assert.equal(parseAnnotation({ ...row, ...changed }), undefined);
  for (const changed of [{ isActive: false }, { items: [row, row] }, { items: [{ ...row, studentId: id }] }, { items: [], nextCursor: 'cursor' }])
    assert.equal(parseAnnotationsList({ ...list, ...changed }), undefined);
});
test('closed fields never show arbitrary response messages or incompatible reason/code', () => {
  assert.deepEqual(decodeAnnotationFields({ code: 'INVALID_INPUT', message: '<script>', fields: [{ field: 'text', reason: 'TEXT_REQUIRED' }] }), [{ field: 'text', reason: annotationMessages.required }]);
  for (const data of [{ code: 'CONFLICT', fields: [{ field: 'text', reason: 'TEXT_REQUIRED' }] },
    { code: 'INVALID_INPUT', fields: [{ field: 'text', reason: 'TEXT_REQUIRED', extra: true }] },
    { code: 'INVALID_INPUT', fields: { text: 'TEXT_REQUIRED' } }]) assert.deepEqual(decodeAnnotationFields(data), []);
});
test('HTTP methods, provenance invariants and DELETE JSON (CA-01/03/05)', async () => {
  const f = fixture(200, list); assert.equal((await f.api.list(studentId, signal())).kind, 'success');
  assert.equal(f.calls[0].url, `http://localhost:3000/api/v1/student-annotations?studentId=${studentId}`);
  assert.equal(f.calls[0].options.cache, 'no-store'); assert.equal(f.calls[0].options.credentials, 'include');
  const c = fixture(201, row); assert.equal((await c.api.create(studentId, row.text, signal())).kind, 'success');
  assert.deepEqual(JSON.parse(c.calls[0].options.body), { studentId, text: row.text });
  const u = fixture(200, { ...row, text: 'Nuevo', updatedAt: '2026-11-11T01:00:00.000Z' });
  assert.equal((await u.api.update(row, 'Nuevo', signal())).kind, 'success'); assert.equal(u.calls[0].options.method, 'PATCH');
  const bad = fixture(200, { ...row, text: 'Nuevo', author: { ...row.author, id }, updatedAt: '2026-11-11T01:00:00.000Z' });
  assert.equal((await bad.api.update(row, 'Nuevo', signal())).kind, 'unavailable');
  const d = fixture(200, { id, studentId, deleted: true }); assert.equal((await d.api.remove(row, signal())).kind, 'success');
  assert.equal(d.calls[0].options.method, 'DELETE'); assert.equal(d.calls[0].options.body, undefined);
});
test('unavailable stays local; real 401/403 propagate; no retry (CA-06/09)', async () => {
  for (const [status, data] of [[503, { code: 'UNAVAILABLE' }], [200, new TypeError('offline')],
    [200, new Response('bad json', { headers: { 'content-type': 'application/json' } })]]) {
    const f = fixture(status, data); const result = await f.api.list(studentId, signal());
    assert.notEqual(result.kind, 'success'); assert.deepEqual(f.events, []); assert.equal(f.calls.length, 1);
  }
  for (const [status, code, category] of [[401, 'UNAUTHENTICATED', 'unauthenticated'], [403, 'FORBIDDEN', 'forbidden']]) {
    const f = fixture(status, { code }); await f.api.list(studentId, signal()); assert.equal(f.events[0].category, category);
  }
});
test('stale generation and invalid identifiers never leak into current selection', async () => {
  let generation = 1;
  const http = createHttpClient('http://localhost:3000', localAnnotationsAccess({ getGeneration: () => generation, notify() {} }), async () => { generation++; return Response.json(list); });
  assert.deepEqual(await createAnnotationsApi(http).list(studentId, signal()), { kind: 'obsolete' });
  const f = fixture(200, list); assert.equal((await f.api.list('bad', signal())).status, 404); assert.equal(f.calls.length, 0);
  const wrong = fixture(200, { ...list, studentId: id, items: [] }); assert.equal((await wrong.api.list(studentId, signal())).kind, 'unavailable');
});
test('annotation payload uses shared host quarantine, fresh lease, purge and stale-handle protections', () => {
  let state = { kind: 'authenticated', generation: 1, denied: false, user: { id: 'actor', role: 'TEACHER' } };
  const host = createStudentDraftHost({ getGeneration: () => state.generation, getSnapshot: () => state });
  const key = { kind: 'student', apiOrigin: 'http://localhost:3000', actorId: 'actor', role: 'TEACHER', studentId, groupId: id };
  let captured = host.capture(); const lease = host.confirm(key, captured.generation, captured.epoch);
  const old = lease.slot('annotations'); const draft = { mode: 'create', text: 'Borrador', focus: 'text' }; old.write(draft);
  assert.deepEqual(parseAnnotationDraft(old.read()), draft);
  host.suspend(); state = { ...state, generation: 2 }; assert.equal(old.read(), undefined);
  captured = host.capture(); const current = host.confirm(key, captured.generation, captured.epoch).slot('annotations');
  old.write(undefined); old.write({ ...draft, text: 'stale' }); assert.deepEqual(current.read(), draft);
  state = { kind: 'signingOut', generation: 3 }; host.sync(); assert.equal(current.read(), undefined);
  state = { kind: 'authenticated', generation: 4, denied: false, user: { id: 'actor', role: 'TEACHER' } };
  captured = host.capture(); assert.equal(host.confirm(key, captured.generation, captured.epoch).slot('annotations').read(), undefined);
});
