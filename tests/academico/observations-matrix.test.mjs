import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMatrixDraft, prepareMatrix, sendMatrix } from '../../src/features/seguimiento/observations/matrix.ts';
import { observationMatrixPath, resolveObservationMatrix } from '../../src/features/seguimiento/observations/navigation.ts';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const group = uuid(99), roster = [1, 2, 3, 4].map(n => ({ id: uuid(n), groupId: group, isActive: true }));
const form = { behavior: 'ATTENTION', frequency: '', area: '', observedOn: '2026-01-01', schoolYear: '2025', term: '1' };
const selected = ['SOMETIMES', 'ALWAYS', '', 'UNOBSERVED'].map((frequency, n) => ({ studentId: roster[n].id, frequency }));
test('T-15: reconciled matrix receipt clears its guard despite an older uncertain row label', () => {
  const row = { studentId: uuid(1), frequency: 'ALWAYS', status: 'uncertain', body: { requestId: uuid(9) } };
  const draft = { form, rows: [row], frozen: true, attempts: [{ reference: { requestId: uuid(9) }, phase: 'uncertain' }] };
  assert.equal(hasMatrixDraft(draft), true);
  assert.equal(hasMatrixDraft({ ...draft, attempts: [{ ...draft.attempts[0], phase: 'confirmed' }] }), false);
  assert.equal(hasMatrixDraft({ ...draft, rows: [{ ...row, status: 'rejected' }], attempts: [] }), true);
  assert.equal(hasMatrixDraft({ ...draft, rows: [{ ...row, status: 'omitted' }], attempts: [] }), false);
});
test('T-16 preparación propia: destino docente de matriz es acotado y no monta el router global', () => {
  assert.deepEqual(resolveObservationMatrix(observationMatrixPath(group)), { kind: 'observationMatrix', groupId: group });
  for (const value of ['/academico/cursos/bad/observaciones', `/academico/cursos/${group}/otra`, '/academico/cursos/%GG/observaciones', '/academico/cursos/a%2Fb/observaciones']) assert.equal(resolveObservationMatrix(value), undefined);
});
test('T-13/CA-02/05/06: freeze valued rows only, manual context and invalid common context sends none', () => {
  const prepared = prepareMatrix(form, roster, selected, group);
  assert.deepEqual(prepared.rows.map(r => r.status), ['ready', 'ready', 'omitted', 'omitted']);
  assert.equal(prepared.rows[0].body.schoolYear, 2025); assert.equal(prepared.rows[0].body.groupId, group);
  assert.equal(new Set(prepared.rows.slice(0, 2).map(r => r.body.requestId)).size, 2);
  assert.ok(prepareMatrix({ ...form, observedOn: '2999-01-01' }, roster, selected, group).issues);
  assert.ok(prepareMatrix(form, [{ ...roster[0], groupId: uuid(98) }], [], group).issues);
  assert.equal(prepareMatrix(form, roster, [{ ...selected[0], frequency: '3' }], group).rows[0].status, 'rejected');
});
test('T-13/CA-06/08: sequential fresh eligibility, partial commit and omitted rows do not POST', async () => {
  const rows = prepareMatrix(form, roster, selected, group).rows, calls = [], changes = [];
  const consents = { snapshot: async id => { calls.push(`check:${id}`); return { kind: 'success', data: { student: roster.find(s => s.id === id), consent: { state: id === uuid(2) ? 'REVOKED' : 'CURRENT' } } }; } };
  const engine = { read: () => [], send: async id => { calls.push(`write:${id}`); return 'confirmed'; } };
  await sendMatrix({ rows, groupId: group, consents, engine, valid: () => true, changed: r => changes.push(r), lost() { assert.fail('not global'); }, signal: new AbortController().signal });
  assert.deepEqual(calls, [`check:${uuid(1)}`, `write:${uuid(1)}`, `check:${uuid(2)}`]);
  assert.equal(changes.findLast(r => r.studentId === uuid(1)).status, 'confirmed'); assert.equal(changes.findLast(r => r.studentId === uuid(2)).status, 'rejected');
});
test('T-13/CA-07/08: global denial stops remaining queue and uncertain inactive result is not rollback', async () => {
  const rows = prepareMatrix(form, roster, selected, group).rows; let lost = 0, writes = 0, checks = 0;
  const engine = { read: () => [], send: async () => { writes++; } };
  const consents = { snapshot: async () => { checks++; return { kind: 'error', status: 403 }; } };
  await sendMatrix({ rows, groupId: group, consents, engine, valid: () => true, changed() {}, lost() { lost++; }, signal: new AbortController().signal });
  assert.equal(lost, 1); assert.equal(writes, 0); assert.equal(checks, 1);
  const attempt = { reference: { requestId: rows[0].body.requestId }, phase: 'uncertain' };
  const changed = [];
  await sendMatrix({ rows: [rows[0]], groupId: group, consents: { snapshot: async () => ({ kind: 'success', data: { student: { ...roster[0], isActive: false }, consent: { state: 'CURRENT' } } }) },
    engine: { ...engine, read: () => [attempt] }, valid: () => true, changed: r => changed.push(r), lost() {}, signal: new AbortController().signal, retry: true });
  assert.equal(changed.at(-1).status, 'uncertain'); assert.equal(writes, 0);
});
test('T-13/CA-07/08: generation changes during eligibility cannot send a stale row or continue queue', async () => {
  const rows = prepareMatrix(form, roster, selected, group).rows; let valid = true, writes = 0, checks = 0;
  await sendMatrix({ rows, groupId: group, consents: { snapshot: async () => { checks++; valid = false; return { kind: 'success', data: { student: roster[0], consent: { state: 'CURRENT' } } }; } },
    engine: { read: () => [], send: async () => { writes++; } }, valid: () => valid, changed() {}, lost() {}, signal: new AbortController().signal });
  assert.equal(checks, 1); assert.equal(writes, 0);
});
