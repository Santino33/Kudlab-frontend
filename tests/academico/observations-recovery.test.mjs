import test from 'node:test';
import assert from 'node:assert/strict';
import { createWriteSession, referenceStore, fingerprint } from '../../src/features/seguimiento/observations/recovery.ts';
const id = '00000000-0000-4000-8000-000000000001', studentId = '00000000-0000-4000-8000-000000000002';
const input = { requestId: id, behavior: 'ATTENTION', frequency: 'SOMETIMES', area: null, observedOn: '2026-01-01', schoolYear: 2025, term: 1 };
const memory = () => { const map = new Map(); return { map, getItem: key => map.get(key) ?? null, setItem: (key, v) => map.set(key, v), removeItem: key => map.delete(key) }; };
const session = (api, store, options = {}) => createWriteSession({ api, store, valid: () => true, changed() {}, lost() {}, ...options });
test('T-10/CA-07: lost confirmation, reload and null never replay; explicit matching retry retains ID', async () => {
  const storage = memory(), store = referenceStore(storage, 'http://localhost:3000', id), writes = [];
  const api = { write: async (...args) => { writes.push(args); return { kind: 'unavailable', uncertain: true }; }, receipt: async () => ({ kind: 'success', data: { receipt: null } }) };
  const first = session(api, store);
  assert.equal(await first.send(studentId, input), 'uncertain');
  const serialized = [...storage.map.values()][0];
  assert.ok(!serialized.includes('SOMETIMES')); assert.ok(!serialized.includes('ATTENTION')); assert.ok(!serialized.includes('2026-01-01'));
  const recovered = session(api, store); recovered.restore(r => r.studentId === studentId);
  assert.equal(recovered.read()[0].body, undefined);
  await recovered.reconcile(recovered.read()[0]); assert.equal(writes.length, 1); assert.equal(recovered.read()[0].phase, 'uncertain');
  assert.equal(await recovered.send(studentId, { ...input, frequency: 'ALWAYS' }, undefined, recovered.read()[0].reference), 'mismatch');
  assert.equal(writes.length, 1);
  assert.equal(await recovered.send(studentId, input, undefined, recovered.read()[0].reference), 'uncertain');
  assert.equal(writes[1][1].requestId, id);
});
test('T-10/CA-07: reference saved before HTTP, storage failure blocks and double click serializes before hashing', async () => {
  const storage = memory(), store = referenceStore(storage, 'http://localhost:3000', id); let calls = 0;
  const api = { write: async () => { calls++; assert.equal(store.read().length, 1); return { kind: 'unavailable', uncertain: true }; } };
  const capture = session(api, store);
  const results = await Promise.all([capture.send(studentId, input), capture.send(studentId, input)]);
  assert.deepEqual(results.sort(), ['blocked', 'uncertain']); assert.equal(calls, 1);
  const broken = referenceStore({ ...storage, setItem() { throw new Error('quota'); } }, 'http://localhost:3001', id);
  assert.equal(await session(api, broken).send(studentId, input), 'storage'); assert.equal(calls, 1);
});
test('T-10/CA-08: origin/actor isolation, minimal fields and malformed storage fail closed', () => {
  const storage = memory(), store = referenceStore(storage, 'http://localhost:3000', id);
  const reference = { requestId: id, studentId, kind: 'CREATE', fingerprint: 'a'.repeat(64) };
  store.put({ ...reference, name: 'never', frequency: 'never', password: 'never' }); assert.deepEqual(store.read(), [reference]);
  assert.deepEqual(referenceStore(storage, 'http://localhost:3001', id).read(), []);
  assert.deepEqual(referenceStore(storage, 'http://localhost:3000', studentId).read(), []);
  storage.setItem([...storage.map.keys()][0], '{'); assert.throws(store.read);
});
test('T-10/CA-07/08: suspense abort keeps uncertain reference; stale response cannot confirm or repopulate', async () => {
  const store = referenceStore(memory(), 'http://localhost:3000', id); let resolve, calls = 0, valid = true, signal;
  const api = { write: async (_id, _body, _hash, s) => { signal = s; return new Promise(done => { resolve = done; }); } };
  const capture = session(api, store, { valid: () => valid, changed() { calls++; } });
  const pending = capture.send(studentId, input);
  // Hashing is asynchronous; barrier observes the actual mocked request, no timer delay.
  while (!resolve) await new Promise(done => setImmediate(done));
  assert.equal(capture.read()[0].phase, 'uncertain'); assert.equal(store.read().length, 1);
  valid = false; capture.dispose(); assert.equal(signal.aborted, true);
  resolve({ kind: 'success', data: {} }); await pending;
  assert.equal(calls, 1); assert.equal(store.read().length, 1); assert.equal(capture.read()[0].phase, 'uncertain');
});
test('T-10/CA-07: fingerprint equals backend canonical order; area omission and UUID case normalize', async () => {
  const body = { ...input, groupId: studentId.toUpperCase(), expectedVersion: 2 };
  const hash = await fingerprint(studentId.toUpperCase(), body, id.toUpperCase());
  const { createHash } = await import('node:crypto');
  assert.equal(hash, createHash('sha256').update(JSON.stringify(['CORRECT', studentId, id, 2, studentId, 'ATTENTION', 'SOMETIMES', null, '2026-01-01', 2025, 1])).digest('hex'));
});
