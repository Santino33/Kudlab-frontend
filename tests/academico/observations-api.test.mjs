import test from 'node:test';
import assert from 'node:assert/strict';
import { createObservationsApi } from '../../src/features/seguimiento/observations/api.ts';
import { fingerprint } from '../../src/features/seguimiento/observations/recovery.ts';
import { formIssues, emptyForm, decodeFields, today } from '../../src/features/seguimiento/observations/types.ts';
const id = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
const input = { requestId: id, behavior: 'ATTENTION', frequency: 'SOMETIMES', area: null, observedOn: '2026-01-01', schoolYear: 2025, term: 1 };
const signal = () => new AbortController().signal;
const revision = { ...input, id, version: 1, actorId: other, recordedAt: '2026-11-09T12:00:00.000Z' }; delete revision.requestId;
test('T-09/CA-01/07: receipt binds intention, values, version and transport; malformed success stays uncertain', async () => {
  const hash = await fingerprint(id, input), receipt = { requestId: id, studentId: id, observationId: other, fingerprint: hash, revision };
  let response = { receipt, repeated: false }; const calls = [];
  const api = createObservationsApi('http://localhost:3000', { getGeneration: () => 1, notify() {} }, async (url, init) => {
    calls.push({ url, init }); return Response.json(response, { status: 201 });
  });
  assert.equal((await api.write(id, input, hash, signal())).kind, 'success');
  assert.equal(calls[0].init.credentials, 'include'); assert.equal(calls[0].init.cache, 'no-store'); assert.equal(calls[0].init.redirect, 'error');
  assert.deepEqual(JSON.parse(calls[0].init.body), input);
  for (const patch of [{ studentId: other }, { requestId: other }, { fingerprint: 'b'.repeat(64) }, { revision: { ...revision, version: 2 } }, { revision: { ...revision, frequency: 'ALWAYS' } }]) {
    response = { receipt: { ...receipt, ...patch }, repeated: false };
    assert.deepEqual(await api.write(id, input, hash, signal()), { kind: 'unavailable', uncertain: true });
  }
  response = { receipt, repeated: true }; assert.equal((await api.write(id, input, hash, signal())).kind, 'unavailable');
});
test('T-09/CA-08: only real auth failures notify globally; closed fields/status prevent false rejection', async () => {
  const notifications = [], access = { getGeneration: () => 1, notify: e => notifications.push(e.category) };
  for (const [status, code, fields, expected] of [
    [409, 'CONFLICT', [{ field: 'observation', reason: 'CONSENT_REQUIRED' }], 'error'],
    [409, 'CONFLICT', { observation: 'CONSENT_REQUIRED' }, 'unavailable'],
    [409, 'CONFLICT', [{ field: 'frequency', reason: 'CONSENT_REQUIRED' }], 'unavailable'],
    [400, 'CONFLICT', [{ field: 'observation', reason: 'CONSENT_REQUIRED' }], 'unavailable'],
    [400, 'INVALID_INPUT', [{ field: 'observedOn', reason: 'future_date' }], 'error'],
    [503, 'UNAVAILABLE', undefined, 'error'], [401, 'UNAUTHENTICATED', undefined, 'error'], [403, 'FORBIDDEN', undefined, 'error'],
  ]) {
    const api = createObservationsApi('http://localhost:3000', access, async () => Response.json({ code, message: 'not displayed', ...(fields === undefined ? {} : { fields }) }, { status }));
    assert.equal((await api.write(id, input, 'a'.repeat(64), signal())).kind, expected);
  }
  assert.deepEqual(notifications, ['unauthenticated', 'forbidden']);
  assert.throws(() => decodeFields({ code: 'INVALID_INPUT', message: '', fields: [{ field: 'area', reason: 'required' }] }));
});
test('T-09/CA-03/08: history identity/order/version/cursor and obsolete generations are checked', async () => {
  let generation = 1, response = { items: [], nextCursor: null };
  const api = createObservationsApi('http://localhost:3000', { getGeneration: () => generation, notify() {} }, async () => Response.json(response));
  assert.equal((await api.history(id, {}, null, signal())).kind, 'success');
  const row = { id, studentId: id, author: { id: other, name: 'Docente ficticio' }, createdAt: revision.recordedAt, version: 1, revision };
  for (const items of [[{ ...row, studentId: other }], [{ ...row, version: 2 }], [row, row]]) {
    response = { items, nextCursor: null }; assert.equal((await api.history(id, {}, null, signal())).kind, 'unavailable');
  }
  response = { items: [row], nextCursor: null };
  assert.equal((await api.history(id, { schoolYear: 2026 }, null, signal())).kind, 'unavailable');
  const stale = createObservationsApi('http://localhost:3000', { getGeneration: () => generation, notify() {} }, async () => { generation++; return Response.json({ items: [], nextCursor: null }); });
  assert.equal((await stale.history(id, {}, null, signal())).kind, 'obsolete');
});
test('T-11/CA-02/06: manual context, no default frequency, Bogotá calendar and no numeric scale', () => {
  assert.equal(emptyForm().frequency, '');
  const form = { behavior: 'ATTENTION', frequency: '', area: '', observedOn: '2026-01-01', schoolYear: '2025', term: '1' };
  assert.deepEqual(formIssues(form), {});
  assert.deepEqual(formIssues({ ...form, frequency: 'UNOBSERVED' }), {});
  for (const change of [{ observedOn: '2025-02-29' }, { observedOn: '0000-01-01' }, { observedOn: '2999-01-01' }, { term: '5' }, { frequency: '3' }, { schoolYear: '' }]) assert.ok(Object.keys(formIssues({ ...form, ...change })).length);
  assert.equal(today(new Date('2026-01-02T04:59:59Z')), '2026-01-01');
  assert.equal(today(new Date('2026-01-02T05:00:00Z')), '2026-01-02');
});
test('T-09/T-12/CA-04/07: correction success verifies target, expected version and all six replacement values', async () => {
  const body = { ...input, requestId: other, expectedVersion: 2, frequency: 'ALWAYS' }, hash = await fingerprint(id, body, other);
  const receipt = { requestId: other, studentId: id, observationId: other, fingerprint: hash, revision: { ...revision, frequency: 'ALWAYS', version: 3 } };
  let response = { receipt, repeated: false };
  const api = createObservationsApi('http://localhost:3000', { getGeneration: () => 1, notify() {} }, async () => Response.json(response, { status: 201 }));
  assert.equal((await api.write(id, body, hash, signal(), other)).kind, 'success');
  response = { receipt: { ...receipt, observationId: id }, repeated: false };
  assert.equal((await api.write(id, body, hash, signal(), other)).kind, 'unavailable');
  response = { receipt: { ...receipt, revision: { ...receipt.revision, version: 4 } }, repeated: false };
  assert.equal((await api.write(id, body, hash, signal(), other)).kind, 'unavailable');
});
test('T-09/CA-03/07: receipt null is not failure, mismatched receipts and unordered revision pages are unavailable', async () => {
  let response = { receipt: null };
  const api = createObservationsApi('http://localhost:3000', { getGeneration: () => 1, notify() {} }, async () => Response.json(response));
  assert.deepEqual(await api.receipt(id, id, 'a'.repeat(64), signal()), { kind: 'success', data: { receipt: null } });
  response = { receipt: { requestId: other, studentId: id, observationId: other, fingerprint: 'a'.repeat(64), revision } };
  assert.equal((await api.receipt(id, id, 'a'.repeat(64), signal())).kind, 'unavailable');
  response = { observation: { id: other, studentId: id, author: { id: other, name: 'Docente ficticio' }, createdAt: revision.recordedAt, version: 2 }, items: [{ ...revision, version: 2 }, revision], nextCursor: null };
  assert.equal((await api.revisions(id, other, null, signal())).kind, 'unavailable');
});
