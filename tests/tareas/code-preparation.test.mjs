import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newPreparation, parsePreparation, preparationKey, readPreparation, savePreparation } from '../../src/features/tareas/activities/code-preparation.ts';
import { prepareCodes } from '../../src/features/tareas/activities/prepare-codes.ts';

const assignment = () => ({ id: randomUUID(), recipients: Array.from({ length: 205 }, () => ({ id: randomUUID() })) });
test('progress survives reload with the same IDs and only correlation data', () => {
  const a = assignment(), op = newPreparation(a.recipients.map(r => r.id), true), key = preparationKey(randomUUID(), a.id), data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  savePreparation(storage, key, { ...op, automatic: false, nextBatch: 1, secret: 'must not persist' });
  assert.ok(!storage.getItem(key).includes('must not persist'));
  // Reconstructing the allowlisted shape on read never turns stored fields into UI state.
  const restored = readPreparation(storage, key, a);
  assert.deepEqual(restored, { ...op, automatic: false, nextBatch: 1 });
  assert.equal(restored.requestIds[1], op.requestIds[1]);
  assert.notDeepEqual(newPreparation(op.recipientIds).requestIds, op.requestIds);
  assert.equal(readPreparation(storage, `${key}-other`, a), undefined);
});
test('rejects foreign/duplicate recipients, malformed operations and impossible progress', () => {
  const a = assignment(), op = newPreparation(a.recipients.map(r => r.id));
  for (const bad of [null, {}, { ...op, recipientIds: [randomUUID()] }, { ...op, recipientIds: [op.recipientIds[0], op.recipientIds[0]] }, { ...op, requestIds: [] }, { ...op, nextBatch: 4 }, { ...op, nextBatch: -1 }, { ...op, automatic: 'yes' }]) assert.equal(parsePreparation(bad, a), undefined);
  assert.throws(() => readPreparation({ getItem: () => '{' }, 'key', a));
});
test('resumes only the unconfirmed batch and preserves its exact request and recipients', async () => {
  const a = assignment(), op = newPreparation(a.recipients.map(r => r.id)), calls = [], confirmed = [];
  const api = { generateCodes: async (id, requestId, ids) => { calls.push([id, requestId, ids]); return { kind: 'success', data: { items: ids.map(recipientId => ({ recipientId })) } }; } };
  const result = await prepareCodes(api, a, batch => op.requestIds[batch], new AbortController().signal, { nextBatch: 1, confirmed: (items, next) => confirmed.push([items.length, next]) });
  assert.equal(result.kind, 'success');
  assert.deepEqual(calls.map(c => c[1]), op.requestIds.slice(1));
  assert.deepEqual(calls.flatMap(c => c[2]), op.recipientIds.slice(100));
  assert.deepEqual(confirmed, [[100, 2], [5, 3]]);
});
test('a complete checkpoint does not replay any mutation', async () => {
  const a = assignment();
  const result = await prepareCodes({ generateCodes: () => assert.fail('already confirmed') }, a, () => '', new AbortController().signal, { nextBatch: 3 });
  assert.equal(result.kind, 'success');
});
test('late success after cancellation cannot publish codes or confirm progress', async () => {
  const a = assignment(), abort = new AbortController(); let resolve;
  const result = prepareCodes({ generateCodes: async () => new Promise(r => { resolve = r; }) }, a, () => randomUUID(), abort.signal, { confirmed: () => assert.fail('obsolete progress') });
  abort.abort(); resolve({ kind: 'success', data: { items: [] } });
  assert.deepEqual(await result, { kind: 'unavailable', uncertain: true });
});
test('each batch has its own deadline rather than timing out the whole assignment', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const a = assignment(), signals = [];
  const api = { generateCodes: async (_id, _requestId, _ids, signal) => {
    signals.push(signal); t.mock.timers.tick(10000);
    return { kind: 'success', data: { items: [] } };
  } };
  assert.equal((await prepareCodes(api, a, () => randomUUID(), new AbortController().signal)).kind, 'success');
  assert.ok(signals.every(s => !s.aborted));
});
test('a timed-out batch never starts the next one, even if the transport returns success', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const api = { generateCodes: async () => { calls++; t.mock.timers.tick(15001); return { kind: 'success', data: { items: [] } }; } };
  assert.deepEqual(await prepareCodes(api, assignment(), () => randomUUID(), new AbortController().signal), { kind: 'unavailable', uncertain: true });
  assert.equal(calls, 1);
});
