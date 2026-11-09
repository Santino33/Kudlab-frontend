import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from '../../src/lib/http.ts';
import { createConsentsApi } from '../../src/features/academico/consents/api.ts';
import { createStudentDraftHost } from '../../src/features/academico/students/student-drafts.ts';
import { operationHandle } from '../../src/features/academico/consents/operation-handle.ts';

const id = '00000000-0000-4000-8000-000000000001';
const signal = () => new AbortController().signal;
test('FormData leaves boundary to browser and rejects incompatible bodies before sending', async () => {
  const calls = [], access = { getGeneration: () => 1, notify() {} };
  const http = createHttpClient('http://localhost:3000', access, async (url, init) => { calls.push({ url, init }); return Response.json({ ok: true }); });
  const formData = new FormData(); formData.append('file', new File(['x'], 'x.png'));
  const options = { method: 'POST', formData, signal: signal(), decode: x => x };
  assert.equal((await http.request('/api/v1/students', options)).kind, 'success');
  assert.equal(calls[0].init.body, formData); assert.equal(calls[0].init.headers['Content-Type'], undefined);
  assert.equal(calls[0].init.credentials, 'include'); assert.equal(calls[0].init.redirect, 'error'); assert.equal(calls[0].init.cache, 'no-store');
  for (const extra of [{ body: {} }, { bodyAbsent: true }, { method: 'GET' }]) {
    assert.equal((await http.request('/api/v1/students', { ...options, ...extra })).uncertain, false);
  }
  assert.equal(calls.length, 1);
});
test('Blob success is bounded and MIME checked; stale generation cannot return bytes', async () => {
  let generation = 1;
  for (const mime of ['text/html', 'application/json', 'image/svg+xml']) {
    const http = createHttpClient('http://localhost:3000', { getGeneration: () => generation, notify() {} }, async () => new Response('x', { headers: { 'content-type': mime } }));
    assert.equal((await http.request('/api/v1/document', { responseType: 'blob', signal: signal(), decode: x => x })).kind, 'unavailable');
  }
  for (const size of [1, 10485760, 10485761]) {
    const http = createHttpClient('http://localhost:3000', { getGeneration: () => generation, notify() {} }, async () => new Response(new Uint8Array(size), { headers: { 'content-type': 'image/png' } }));
    const result = await http.request('/api/v1/document', { responseType: 'blob', signal: signal(), decode: x => x });
    assert.equal(result.kind, size <= 10485760 ? 'success' : 'unavailable');
  }
  const http = createHttpClient('http://localhost:3000', { getGeneration: () => generation, notify() {} }, async () => {
    generation++; return new Response('x', { headers: { 'content-type': 'image/png' } });
  });
  assert.equal((await http.request('/api/v1/document', { responseType: 'blob', signal: signal(), decode: x => x })).kind, 'obsolete');
});
test('consent failure stays local, real 401/403 remain global and malformed success is uncertain', async () => {
  const notifications = [], access = { getGeneration: () => 2, notify: x => notifications.push(x) };
  for (const status of [401, 403, 503]) {
    const api = createConsentsApi('http://localhost:3000', access, async () => Response.json({ code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE' }, { status }));
    await api.snapshot(id, signal());
  }
  assert.deepEqual(notifications.map(x => x.category), ['unauthenticated', 'forbidden']);
  const api = createConsentsApi('http://localhost:3000', access, async () => Response.json({}));
  const result = await api.register(id, { requestId: id, expectedVersion: 0, signedOn: '2026-01-01', receivedOn: '2026-01-01' }, new File(['x'], 'x.png'), signal());
  assert.equal(result.kind, 'unavailable'); assert.equal(result.uncertain, true); assert.equal(notifications.length, 2);
});
test('host seals before abort, denies stale handles and requires fresh academic confirmation', () => {
  let state = { kind: 'authenticated', generation: 1, denied: false, user: { id, role: 'TEACHER' } };
  const host = createStudentDraftHost({ getSnapshot: () => state, getGeneration: () => state.generation });
  const key = { apiOrigin: 'http://localhost:3000', actorId: id, role: 'TEACHER', groupId: 'group', kind: 'student', studentId: id };
  const first = host.confirm(key, 1, host.capture().epoch), slot = first.slot('consent');
  const file = new File(['x'], 'ficticio.png'); slot.write({ file, signedOn: '', receivedOn: '', phase: 'sending' });
  first.onStop(() => assert.equal(slot.read(), undefined));
  host.suspend();
  state = { kind: 'checking', generation: 2, context: 'session' }; host.sync();
  slot.write(undefined); assert.equal(slot.read(), undefined);
  state = { kind: 'authenticated', generation: 3, denied: false, user: { id, role: 'TEACHER' } };
  assert.equal(host.confirm(key, 1, 0), undefined);
  assert.equal(slot.read(), undefined);
  const captured = host.capture(), second = host.confirm(key, captured.generation, captured.epoch), fresh = second.slot('consent');
  assert.equal(fresh.read().file, file); assert.equal(fresh.read().phase, 'uncertain');
  slot.write(undefined); slot.write({ signedOn: 'stale' }); first.discard(); assert.equal(fresh.read().file, file);
  state = { kind: 'checking', generation: 4, context: 'denied' }; host.sync();
  state = { kind: 'authenticated', generation: 5, denied: false, user: { id, role: 'TEACHER' } };
  const third = host.confirm(key, 5, host.capture().epoch); assert.equal(third.slot('consent').read(), undefined);
});
test('selection change, signout and matrix context cannot restore another draft', () => {
  let state = { kind: 'authenticated', generation: 1, denied: false, user: { id, role: 'TEACHER' } };
  const host = createStudentDraftHost({ getSnapshot: () => state, getGeneration: () => state.generation });
  const key = { apiOrigin: 'http://localhost:3000', actorId: id, role: 'TEACHER', groupId: 'group', kind: 'student', studentId: id };
  const capture = host.capture(), old = host.confirm(key, 1, capture.epoch); old.slot('notes').write({ text: 'fixture' });
  const matrix = host.confirm({ ...key, kind: 'observationMatrix' }, 1, capture.epoch); assert.equal(matrix.slot('notes').read(), undefined);
  assert.equal(host.confirm(key, 1, capture.epoch), undefined);
  matrix.slot('observationMatrix').write({ text: 'matrix fixture' });
  state = { kind: 'signingOut', generation: 2 }; host.sync();
  assert.equal(matrix.slot('observationMatrix').read(), undefined);
});
test('operation handle persists only three IDs and does not cross identity/selection', () => {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const handle = operationHandle(storage);
  handle.write({ actorId: id, studentId: id, requestId: id, file: 'never', reason: 'never' });
  assert.deepEqual(JSON.parse([...data.values()][0]), { actorId: id, studentId: id, requestId: id });
  assert.ok(handle.read(id, id)); assert.equal(handle.read('different', id), undefined); assert.equal(data.size, 0);
});
test('global unavailability from another section seals synchronously even before subscription effects', () => {
  let state = { kind: 'authenticated', generation: 1, denied: false, user: { id, role: 'TEACHER' } };
  const host = createStudentDraftHost({ getSnapshot: () => state, getGeneration: () => state.generation });
  const key = { apiOrigin: 'http://localhost:3000', actorId: id, role: 'TEACHER', groupId: 'group', kind: 'student', studentId: id };
  const lease = host.confirm(key, 1, host.capture().epoch), slot = lease.slot('consent');
  slot.write({ signedOn: '2026-01-01', receivedOn: '2026-01-02', phase: 'sending' });
  let stopped = false; lease.onStop(() => { stopped = true; });
  state = { kind: 'checkUnavailable', context: 'session', generation: 2 };
  assert.equal(slot.read(), undefined); assert.equal(stopped, true); slot.write(undefined);
  state = { kind: 'authenticated', generation: 3, denied: false, user: { id, role: 'TEACHER' } };
  const capture = host.capture(), fresh = host.confirm(key, 3, capture.epoch);
  assert.equal(fresh.slot('consent').read().phase, 'uncertain');
  assert.equal(fresh.slot('consent').read().signedOn, '2026-01-01');
});
