import test from 'node:test';
import assert from 'node:assert/strict';
import envelope from '../../contract/kudlab-runtime-1.3.0/envelope-2.0.synthetic.json' with { type: 'json' };
import profile from '../../contract/kudlab-runtime-1.3.0/mentalista-profile.json' with { type: 'json' };
import { parseDefinitions, parseHistoryPage } from '../../src/features/indicadores/types.ts';
import { createIndicatorsApi, filterError } from '../../src/features/indicadores/api.ts';
import { indicatorDetailPath, resolveIndicatorRoute } from '../../src/features/indicadores/routes.ts';
import { validMentalistaPreparation, parseMentalistaTrial, validMentalistaIndicator } from '../../src/features/tareas/activities/mentalista-types.ts';
import { parseSession } from '../../src/features/tareas/activities/types.ts';

const id = envelope.sessionId;
const indicator = { metricCode: 'delta_precision_pts', scope: 'SESSION', status: 'CALCULATED', value: -25, unit: 'points', numerator: null, denominator: null, sampleSize: 6, unavailabilityReason: null };
const history = () => ({ studentId: id, nextCursor: null, items: [{ sessionId: id, taskId: 'TG-03', attemptNumber: 1, occurredAt: '2026-11-13T15:00:00.000Z', executionStatus: 'COMPLETED', processingStatus: 'COMPLETED', configVersion: 1,
  publishedVersionId: envelope.publishedVersionId, incidentCount: 0, recordedTrialCount: 12, rule: { code: 'TG03-DESCRIPTIVE-1', version: 1, approval: { current: 'PROPOSED', approvedAt: null } }, approvalAtCalculation: 'NOT_ESTABLISHED',
  calculation: { runId: id, calculatedAt: '2026-11-13T15:00:01.000Z' }, indicators: [indicator], detailAccess: 'AVAILABLE', mentalista: { configuration: profile.config, configurationHash: profile.configurationHash, gameBuildId: 'tg03-mentalista-1', device: envelope.device, preparation: envelope.preparation } }] });
const definition = (taskId) => ({ taskId, metricCode: 'accuracy_pct', label: 'Precisión', description: 'Descripción sintética', calculation: 'Fórmula sintética', unit: '%', scopes: ['SESSION'], inputs: 'Datos sintéticos', unavailabilityReasons: [], exclusions: 'Exclusiones sintéticas', rule: null });
const detail = () => ({ id, studentId: id, assignmentId: id, taskId: 'TG-03', launchMode: 'CODE', configVersion: 1, gameBuildId: 'tg03-mentalista-1', publishedVersionId: envelope.publishedVersionId,
  configurationHash: profile.configurationHash, configuration: profile.config, device: envelope.device, preparation: envelope.preparation, extraResponseCount: 0, attemptNumber: 1,
  executionStatus: 'COMPLETED', processingStatus: 'PENDING', preparedAt: '2026-11-13T15:00:00.000Z', startedAtServer: '2026-11-13T15:00:00.000Z', receivedAt: '2026-11-13T15:03:00.000Z', incidentCount: 0, recordedTrialCount: 12,
  declaredState: 'completed', terminationReason: 'items_completed', measuredDurationMs: 180000, receipt: { submissionId: envelope.submissionId, evidenceHash: 'a'.repeat(64), receivedAt: '2026-11-13T15:03:00.000Z' }, calculation: null });

test('CA-08/09: detalle pendiente conserva evidencia sin fabricar cálculo y rechaza cierres contradictorios', () => {
  assert.ok(parseSession(detail()));
  for (const patch of [{ terminationReason: 'focus_lost' }, { device: null }, { preparation: null }, { configurationHash: '0'.repeat(64) }, { receipt: null }]) assert.equal(parseSession({ ...detail(), ...patch }), undefined);
  assert.ok(parseSession({ ...detail(), processingStatus: 'FAILED', calculation: { runId: id, ruleCode: 'TG03-DESCRIPTIVE-1', ruleVersion: 1, status: 'FAILED', calculatedAt: null, summary: {}, indicators: [] } }));
});

test('CA-10/11/13: catálogo por tarea+métrica; rutas TG-01 históricas y TG-03 inequívocas', () => {
  assert.equal(parseDefinitions({ items: [definition('TG-01'), definition('TG-03')] }).length, 2);
  assert.equal(parseDefinitions({ items: [definition('TG-03'), definition('TG-03')] }), undefined);
  assert.equal(parseDefinitions({ items: [{ ...definition('TG-03'), scopes: ['SEGMENT_1'] }] }), undefined);
  const path = indicatorDetailPath('selection_position_1_count', 'TG-03');
  assert.deepEqual(resolveIndicatorRoute(path), { kind: 'indicatorDetail', taskId: 'TG-03', metricCode: 'selection_position_1_count' });
  assert.equal(indicatorDetailPath('accuracy_pct'), '/indicadores/accuracy_pct');
});
test('CA-09/11: delta negativo, CV >100 y recuento no se tratan como porcentajes acotados', () => {
  assert.equal(parseHistoryPage(history(), id, 'TG-03').items[0].indicators[0].value, -25);
  assert.ok(validMentalistaIndicator({ ...indicator, metricCode: 'rt_cv_pct', unit: '%', value: 150 }));
  assert.ok(validMentalistaIndicator({ ...indicator, metricCode: 'selection_position_1_count', unit: 'count', value: 3 }));
  for (const patch of [{ unit: '%' }, { scope: 'LOAD_1' }, { status: 'NOT_AVAILABLE' }, { unavailabilityReason: 'NO_VALID_ITEMS' }]) assert.equal(validMentalistaIndicator({ ...indicator, ...patch }), false);
});
test('CA-11/13: historia rechaza tarea/regla/configuración mezcladas, duplicados y estudiante distinto', () => {
  assert.equal(parseHistoryPage(history(), id), undefined);
  for (const mutate of [p => p.items[0].taskId = 'TG-01', p => p.items[0].rule.code = 'TG01-DESCRIPTIVE-1', p => p.items[0].mentalista.configurationHash = '0'.repeat(64), p => p.items.push(p.items[0]), p => p.items[0].indicators.push(indicator), p => p.studentId = envelope.submissionId]) {
    const p = structuredClone(history()); mutate(p); assert.equal(parseHistoryPage(p, id, 'TG-03'), undefined);
  }
});
test('CA-03/09: práctica y decisiones matemáticas conservan coherencia del productor', () => {
  assert.ok(validMentalistaPreparation(envelope.preparation));
  const bad = structuredClone(envelope.preparation); bad.practice[0].items[0].result = 'incorrect';
  assert.equal(validMentalistaPreparation(bad), false);
  for (const t of envelope.events) assert.ok(parseMentalistaTrial({ ...t, calculationDecision: null }));
  const t = { ...envelope.events[0], calculationDecision: null };
  assert.equal(parseMentalistaTrial({ ...t, optionsShownAtMs: t.startedAtMs }), undefined);
  assert.equal(parseMentalistaTrial({ ...t, closureReason: 'timeout' }), undefined);
  assert.equal(parseMentalistaTrial({ ...t, selectedAtMs: t.closedAtMs + 1 }), undefined);
});
test('CA-11: filtros incompatibles no consultan; transporte incluye tarea/carga y valida respuesta', async () => {
  const calls = [], api = createIndicatorsApi({ request: async (url, options) => { calls.push(url); return { kind: 'success', data: options.decode(history()) }; } });
  const signal = new AbortController().signal;
  assert.equal(filterError({ taskId: 'TG-03', metricCode: 'delta_precision_pts', scope: 'LOAD_1' }), 'scope');
  assert.equal((await api.mentalistaHistory(id, { taskId: 'TG-03', scope: 'SEGMENT_1' }, signal)).kind, 'error');
  assert.equal(calls.length, 0);
  assert.equal((await api.mentalistaHistory(id, { taskId: 'TG-03', scope: 'SESSION' }, signal)).data.items.length, 1);
  assert.match(calls[0], /taskId=TG-03/); assert.match(calls[0], /scope=SESSION/);
});
