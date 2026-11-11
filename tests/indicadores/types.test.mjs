import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDefinitions, parseHistoryPage, parseHistorySession } from '../../src/features/indicadores/types.ts';
import { PEDAGOGICAL_NOTICE, SCOPE_LABELS, metricLabels, unavailableLabels } from '../../src/features/indicadores/copy.ts';
const id = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002', third = '10000000-0000-4000-8000-000000000003';
const calculated = { metricCode: 'accuracy_pct', scope: 'SESSION', status: 'CALCULATED', value: 80, unit: '%', numerator: 8, denominator: 10, sampleSize: 10, unavailabilityReason: null };
const missing = { metricCode: 'rt_sd_ms', scope: 'SEGMENT_2', status: 'NOT_AVAILABLE', value: null, unit: 'ms', numerator: null, denominator: null, sampleSize: 0, unavailabilityReason: 'NO_VALID_RT' };
const rule = { code: 'TG01-DESCRIPTIVE-1', version: 1, approval: { current: 'PROPOSED', approvedAt: null } };
const session = (sessionId, occurredAt, extra = {}) => ({ sessionId, taskId: 'TG-01', attemptNumber: 1, occurredAt, executionStatus: 'COMPLETED', processingStatus: 'COMPLETED', configVersion: 1,
  publishedVersionId: other, incidentCount: 0, recordedTrialCount: 10, rule, approvalAtCalculation: 'NOT_ESTABLISHED', calculation: { runId: third, calculatedAt: occurredAt }, indicators: [calculated, missing], detailAccess: 'AVAILABLE', ...extra });
const page = (items, extra = {}) => ({ studentId: id, items, nextCursor: null, ...extra });
const definition = { metricCode: 'omission_rate_pct', taskId: 'TG-01', label: 'Omisión', description: 'd', calculation: 'c', unit: '%', scopes: ['SESSION', 'SEGMENT_1'], inputs: 'i', unavailabilityReasons: ['NO_VALID_TARGETS'], exclusions: 'e', rule: null };

test('historia válida: orden descendente estable, ausencia sin cero y sin ejecución vigente', () => {
  const ok = page([session(other, '2026-03-02T15:00:00.000Z'), session(third, '2026-03-01T15:00:00.000Z', { calculation: null, indicators: [], processingStatus: 'PENDING' })]);
  assert.equal(parseHistoryPage(ok, id)?.items.length, 2);
  assert.equal(parseHistoryPage(ok, id).items[0].indicators[1].value, null);
});
test('rechaza valor en no disponible (también cero), calculado sin valor o con motivo, motivos y métricas fuera de catálogo', () => {
  for (const bad of [{ ...missing, value: 0 }, { ...missing, unavailabilityReason: null }, { ...calculated, value: null }, { ...calculated, unavailabilityReason: 'NO_VALID_RT' },
    { ...calculated, metricCode: 'iq' }, { ...missing, unavailabilityReason: 'OTRO' }, { ...calculated, unit: 'ms' }, { ...calculated, extra: 1 }])
    assert.equal(parseHistorySession(session(other, '2026-03-02T15:00:00.000Z', { indicators: [bad] })), undefined);
});
test('rechaza estudiante distinto, sesiones duplicadas o desordenadas, indicadores repetidos e indicadores sin ejecución', () => {
  const a = session(other, '2026-03-02T15:00:00.000Z'), b = session(third, '2026-03-01T15:00:00.000Z');
  assert.equal(parseHistoryPage(page([a, b], { studentId: third }), id), undefined);
  assert.equal(parseHistoryPage(page([a, a]), id), undefined);
  assert.equal(parseHistoryPage(page([b, a]), id), undefined);
  assert.equal(parseHistorySession(session(other, '2026-03-02T15:00:00.000Z', { indicators: [calculated, calculated] })), undefined);
  assert.equal(parseHistorySession(session(other, '2026-03-02T15:00:00.000Z', { calculation: null })), undefined);
});
test('rechaza campos de asignación, curso o referencia de aprobación', () => {
  for (const extra of [{ assignmentId: id }, { groupId: id }, { approvalReference: 'x' }]) assert.equal(parseHistorySession(session(other, '2026-03-02T15:00:00.000Z', extra)), undefined);
});
test('catálogo: acepta definiciones válidas y rechaza unidad distinta, duplicados o campos extra', () => {
  assert.equal(parseDefinitions({ items: [definition] }).length, 1);
  assert.equal(parseDefinitions({ items: [{ ...definition, unit: 'ms' }] }), undefined);
  assert.equal(parseDefinitions({ items: [definition, definition] }), undefined);
  assert.equal(parseDefinitions({ items: [{ ...definition, score: 1 }] }), undefined);
});
test('copy: aviso presente, alcances y etiquetas descriptivas sin lenguaje diagnóstico', () => {
  assert.match(PEDAGOGICAL_NOTICE, /complementaria/); assert.match(PEDAGOGICAL_NOTICE, /no constituyen un diagnóstico clínico/);
  const text = JSON.stringify([SCOPE_LABELS, metricLabels, unavailableLabels]).toLowerCase();
  for (const w of ['déficit', 'anormal', 'ranking', 'riesgo', 'mejora', 'empeora', 'tendencia']) assert.ok(!text.includes(w), w);
});
