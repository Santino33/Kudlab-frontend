import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivitiesApi } from '../../src/features/tareas/activities/api.ts';
import { accessMessage, parseCode, parseRevealedCode, parseSessionSummary } from '../../src/features/tareas/activities/types.ts';
import { createHttpClient } from '../../src/lib/http.ts';
const id = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
const metadata = { id, recipientId: other, scope: 'PLAY_AND_SUBMIT', sessionId: null, status: 'ACTIVE', createdAt: '2026-10-27T12:00:00Z', expiresAt: '2026-10-28T12:00:00Z', lastClaimedAt: null, canReveal: true, unavailableReasons: [] };
const reveal = { codeId: id, code: 'ERD34', scope: 'PLAY_AND_SUBMIT', expiresAt: metadata.expiresAt };
const signal = () => new AbortController().signal;
test('five-character contract rejects incompatible code/metadata and distribution URLs never contain secrets', () => {
  assert.ok(parseCode(metadata)); assert.ok(parseRevealedCode(reveal)); assert.equal(parseCode({ ...metadata, scope: 'SUBMIT_ONLY' }), undefined);
  assert.equal(parseRevealedCode({ ...reveal, code: 'ABCD1234' }), undefined);
  const message = accessMessage(reveal, 'Lluvia de estrellas', 'https://play.example'); assert.match(message, /ERD34/); assert.match(message, /https:\/\/play.example\//); assert.doesNotMatch(message, /\?code|#ERD34|enviado/i);
  assert.match(accessMessage({ ...reveal, scope: 'SUBMIT_ONLY' }, 'Lluvia', 'https://play.example'), /\/pendientes/);
  assert.throws(() => accessMessage(reveal, 'Lluvia', 'https://evil.example/?code=ERD34'));
});
test('mutations preserve requestId, reject foreign reveals, and use protected no-store transport', async () => {
  const calls = []; let value = { ...reveal, codeId: other };
  const api = createActivitiesApi(createHttpClient('http://localhost:4300', { getGeneration: () => 1, notify() {} }, async (url, init) => { calls.push({ url, init }); return Response.json(value); }));
  assert.equal((await api.revealCode(id, signal())).kind, 'unavailable'); value = reveal;
  assert.equal((await api.revealCode(id, signal())).kind, 'success'); assert.equal(calls.at(-1).init.credentials, 'include'); assert.equal(calls.at(-1).init.cache, 'no-store');
  value = { items: [metadata], createdCount: 1, reusedCount: 0 };
  await api.generateCodes(id, other, [other], signal()); await api.generateCodes(id, other, [other], signal()); assert.equal(calls.at(-1).init.body, calls.at(-2).init.body);
  assert.equal(JSON.parse(calls.at(-1).init.body).requestId, other);
});
test('CODE provenance is accepted without changing session result semantics', () => {
  const base = { id, studentId: other, assignmentId: id, taskId: 'TG-01', launchMode: 'CODE', executionStatus: 'READY', processingStatus: 'NOT_RECEIVED', configVersion: 1, gameBuildId: 'tg01-viewport-rebuild-2', preparedAt: metadata.createdAt, startedAtServer: null, receivedAt: null, attemptNumber: null, incidentCount: 0, recordedTrialCount: 0 };
  assert.ok(parseSessionSummary(base)); assert.ok(parseSessionSummary({ ...base, launchMode: 'SUPERVISED' })); assert.equal(parseSessionSummary({ ...base, launchMode: 'STUDENT' }), undefined);
});
