import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivitiesApi } from '../../src/features/tareas/activities/api.ts';
import { parseSession, parseAssignment, parsePage } from '../../src/features/tareas/activities/types.ts';
import { acceptsRuntimeMessage } from '../../src/features/tareas/activities/bridge.ts';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';
import { createHttpClient } from '../../src/lib/http.ts';
const id = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
const assignment = { id, taskId: 'TG-01', title: 'Lluvia de estrellas', publishedVersionId: other, configVersion: 1, groupId: id,
  startsAt: '2026-10-27T12:00:00Z', endsAt: '2026-10-28T12:00:00Z', maxAttempts: 2, status: 'OPEN', availability: 'CURRENT', recipientCount: 0, createdAt: '2026-10-27T11:00:00Z', recipients: [] };
function fixture(value) { const calls = []; const api = createActivitiesApi(createHttpClient('http://localhost:4300', { getGeneration: () => 1, notify() {} }, async (url, init) => { calls.push({ url, init }); return Response.json(value); })); return { api, calls }; }
const signal = () => new AbortController().signal;
test('J02 IDs are checked without crashing or hitting transport; mismatched resources cannot restore data', async () => {
  const f = fixture(assignment);
  assert.equal((await f.api.assignment('../private', signal())).status, 404); assert.equal(f.calls.length, 0);
  assert.equal((await f.api.assignment(other, signal())).kind, 'unavailable');
  assert.equal((await f.api.assignment(id, signal())).kind, 'success');
  assert.equal(f.calls.at(-1).init.credentials, 'include'); assert.equal(f.calls.at(-1).init.cache, 'no-store');
});
test('idempotent mutations keep the supplied requestId and never replay automatically', async () => {
  const f = fixture(assignment), input = { requestId: other, taskId: 'TG-01', publishedVersionId: other, groupId: id, studentIds: [], startsAt: assignment.startsAt, endsAt: assignment.endsAt, maxAttempts: 2 };
  await f.api.create(input, signal()); await f.api.create(input, signal());
  assert.equal(JSON.parse(f.calls[0].init.body).requestId, other); assert.equal(f.calls[0].init.body, f.calls[1].init.body);
});
test('strict bridge checks origin, source, correlation, identifiers and shape; browser message is not a receipt', () => {
  const source = {}, origin = 'http://127.0.0.1:4178', data = { type: 'RESULTS_SAVED', bridgeId: id, sessionId: id, submissionId: other };
  assert.equal(acceptsRuntimeMessage({ origin, source, data }, origin, source, id), true);
  for (const event of [{ origin: 'https://evil.invalid', source, data }, { origin, source: {}, data }, { origin, source, data: { ...data, evidence: {} } }, { origin, source, data: { ...data, bridgeId: other } }]) assert.equal(acceptsRuntimeMessage(event, origin, source, id), false);
});
test('absence is never a fabricated score and incompatible DTOs are rejected', () => {
  assert.equal(parseSession({}), undefined); assert.equal(parseAssignment({ ...assignment, recipientCount: 1 }), undefined);
  assert.deepEqual(parsePage({ items: [], nextCursor: null }, parseAssignment), { items: [], nextCursor: null });
});
test('direct assignment, session, execution and recovery routes preserve explicit context', () => {
  assert.equal(resolveRoute(`/academico/cursos/${id}/asignaciones`, '').kind, 'assignments');
  assert.equal(resolveRoute(`/academico/cursos/${id}/asignaciones/${other}/destinatarios/${id}/ejecucion`, '').kind, 'supervisedExecution');
  assert.equal(resolveRoute(`/academico/cursos/${id}/estudiantes/${other}/tareas/${id}/recuperacion`, '').kind, 'submissionRecovery');
});
