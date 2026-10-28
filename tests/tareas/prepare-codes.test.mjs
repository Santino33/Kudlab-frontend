import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareCodes } from '../../src/features/tareas/activities/prepare-codes.ts';

test('prepares exactly the assigned recipients in batches of at most 100, with stable request IDs', async () => {
  const assignment = { id: 'assignment', recipients: Array.from({ length: 205 }, (_, n) => ({ id: `synthetic-${n}` })) }, calls = [];
  const api = { generateCodes: async (...args) => { calls.push(args); return { kind: 'success', data: {} }; } };
  const signal = new AbortController().signal;
  assert.deepEqual(await prepareCodes(api, assignment, batch => `batch-${batch}`, signal), { kind: 'success', data: assignment });
  assert.deepEqual(calls.map(c => c[2].length), [100, 100, 5]);
  assert.deepEqual(calls.flatMap(c => c[2]), assignment.recipients.map(r => r.id));
  assert.deepEqual(calls.map(c => c[1]), ['batch-0', 'batch-1', 'batch-2']);
  assert.ok(calls.every(c => c[0] === assignment.id && c[3] instanceof AbortSignal && !c[3].aborted));
  assert.equal(new Set(calls.map(c => c[3])).size, 3);
});
test('a partial or uncertain batch stops the flow; manual reconciliation repeats the same IDs, never creates another assignment', async () => {
  const assignment = { id: 'assignment', recipients: Array.from({ length: 101 }, (_, n) => ({ id: `synthetic-${n}` })) }, calls = [];
  const failure = { kind: 'unavailable', uncertain: true }; let fail = true;
  const api = { generateCodes: async (id, requestId) => { calls.push([id, requestId]); return requestId === 'batch-1' && fail ? failure : { kind: 'success', data: {} }; } };
  const signal = new AbortController().signal;
  assert.equal(await prepareCodes(api, assignment, batch => `batch-${batch}`, signal), failure);
  fail = false;
  assert.equal((await prepareCodes(api, assignment, batch => `batch-${batch}`, signal)).kind, 'success');
  assert.deepEqual(calls, [['assignment', 'batch-0'], ['assignment', 'batch-1'], ['assignment', 'batch-0'], ['assignment', 'batch-1']]);
});
