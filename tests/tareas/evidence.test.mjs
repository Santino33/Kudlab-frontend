import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrial, parseIncident, parseSession, trialTimes, validConfiguration } from '../../src/features/tareas/activities/types.ts';
import { createActivitiesApi } from '../../src/features/tareas/activities/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';

const id = '10000000-0000-4000-8000-000000000001';
const trial = { trial: 1, stimulus: 'star', spawnedAtMs: 0, presentedAtMs: 0, respondedAtMs: 0, closedAtMs: 0,
  result: 'hit', segment: 1, closureReason: 'response', responseWindowCompleted: false, responseDevice: 'touch', geometry: { lane: 1, x: 60, size: 90 },
  calculationDecision: { trial: 1, included: true, rtIncluded: true, reason: null } };
const incident = { sequence: 1, type: 'network_lost', category: 'CONTEXT_ONLY', clockId: id, atMs: 0, endedAtMs: null, recordedAtClient: null };
// Synthetic profile from the canonical TG-01 1.1 contract; no new runtime configuration.
const configuration = { durationMs: 120000, segmentBoundariesMs: [0, 40000, 80000, 120000], fallSpeedUnitsPerSecond: 210,
  spawnIntervalMs: { min: 1100, max: 1800 }, starProbability: .7, stimulusSizeUnits: { min: 75, max: 105 }, minimumDistanceUnits: 180,
  positionAttempts: 30, presentationRule: 'FULLY_VISIBLE', maxFrameGapMs: 250, minimumStageScale: .6, inputProfile: 'POINTER_V1',
  layoutRule: 'VIEWPORT_FIT_V2', referenceWidthUnits: 480, minimumLaneWidthUnits: 120, maximumLanes: 6 };
const session = { id, studentId: id, taskId: 'TG-01', assignmentId: id, attemptNumber: 1, launchMode: 'SUPERVISED', configVersion: 1,
  gameBuildId: 'tg01-viewport-rebuild-2', executionStatus: 'COMPLETED', processingStatus: 'PENDING', preparedAt: '2026-11-06T12:00:00Z',
  startedAtServer: '2026-11-06T12:01:00Z', receivedAt: '2026-11-06T12:03:10Z', incidentCount: 0, recordedTrialCount: 1,
  publishedVersionId: id, configurationHash: 'a'.repeat(64), configuration, declaredState: 'completed', terminationReason: 'time_limit', measuredDurationMs: 120000,
  device: { viewportWidth: 390, viewportHeight: 844, stageWidthCss: 390, stageHeightCss: 772, stageScale: .8125, touchCapable: true },
  receipt: { submissionId: id, receivedAt: '2026-11-06T12:03:10Z', evidenceHash: 'b'.repeat(64) }, calculation: null };

test('CA-08: preserves zero and observed duration for response, natural exit, cutoff and never presented', () => {
  assert.deepEqual(trialTimes(parseTrial(trial)), { durationMs: 0, reactionTimeMs: 0 });
  for (const closureReason of ['window_elapsed', 'session_cutoff', 'interruption', 'never_presented']) {
    const never = closureReason === 'never_presented';
    const value = { ...trial, respondedAtMs: null, responseDevice: null, presentedAtMs: never ? null : 100,
      segment: never ? null : 1, closedAtMs: 300, closureReason, responseWindowCompleted: closureReason === 'window_elapsed',
      result: closureReason === 'window_elapsed' ? 'miss' : 'not_evaluated', calculationDecision: null };
    assert.deepEqual(trialTimes(parseTrial(value)), { durationMs: never ? null : 200, reactionTimeMs: null });
  }
});
test('CA-08: malformed timing, enums, devices, geometry and calculation decisions are rejected', () => {
  for (const patch of [{ trial: 0 }, { presentedAtMs: NaN }, { closedAtMs: Infinity }, { respondedAtMs: -1 },
    { closedAtMs: -1 }, { presentedAtMs: 20 }, { segment: null }, { result: 'arbitrary-text' }, { responseDevice: null },
    { responseWindowCompleted: true }, { geometry: { lane: 7, x: 0, size: 90 } }, { calculationDecision: { ...trial.calculationDecision, trial: 2 } },
    { calculationDecision: { ...trial.calculationDecision, included: false } }, { calculationDecision: undefined }])
    assert.equal(parseTrial({ ...trial, ...patch }), undefined);
});
test('CA-08: recovery uses its client date, never a fabricated monotonic timestamp', () => {
  assert.deepEqual(parseIncident(incident), incident);
  const recovered = { ...incident, type: 'recovered_after_reload', category: 'EXECUTION_INTERRUPTED', clockId: null, atMs: null, recordedAtClient: '2026-11-06T12:00:00Z' };
  assert.deepEqual(parseIncident(recovered), recovered);
  for (const patch of [{ clockId: id }, { atMs: 0 }, { recordedAtClient: null }]) assert.equal(parseIncident({ ...recovered, ...patch }), undefined);
  for (const patch of [{ sequence: -1 }, { type: 'unknown' }, { category: 'unknown' }, { clockId: 'bad' }, { endedAtMs: -1 }, { atMs: null }]) assert.equal(parseIncident({ ...incident, ...patch }), undefined);
});
test('CA-04/08: accepts historical 1.0/1.1 profiles and rejects incompatible or malformed detail', () => {
  assert.deepEqual(parseSession(session), session);
  const { layoutRule, referenceWidthUnits, minimumLaneWidthUnits, maximumLanes, ...shared } = configuration;
  const legacy = { ...shared, logicalWidth: 960, logicalHeight: 600, lanes: 6 };
  assert.equal(validConfiguration(legacy), true);
  assert(parseSession({ ...session, configuration: legacy, gameBuildId: 'tg01-reference-rebuild-1', device: { viewportWidth: 960, viewportHeight: 700, stageScale: 1, touchCapable: false } }));
  for (const patch of [{ configuration: {} }, { configuration: { ...configuration, durationMs: 1000 } }, { gameBuildId: 'unknown' }, { device: { ...session.device, stageScale: 0 } }, { terminationReason: 'arbitrary-text' }]) assert.equal(parseSession({ ...session, ...patch }), undefined);
});
test('CA-06/08: decoder rejects malformed or duplicated pages and preserves cursor without a fake success', async () => {
  for (const [items, kind, expected] of [[[trial], 'trials', 'success'], [[incident], 'incidents', 'success'], [[trial, trial], 'trials', 'unavailable'], [[{ ...trial, closedAtMs: -1 }], 'trials', 'unavailable'], [[trial], 'incidents', 'unavailable']]) {
    const api = createActivitiesApi(createHttpClient('http://localhost:4300', { getGeneration: () => 1, notify() {} }, async () => Response.json({ items, nextCursor: 'opaque-cursor' })));
    const result = await api.evidence(id, kind, new AbortController().signal);
    assert.equal(result.kind, expected);
    if (result.kind === 'success') assert.equal(result.data.nextCursor, 'opaque-cursor');
  }
});
