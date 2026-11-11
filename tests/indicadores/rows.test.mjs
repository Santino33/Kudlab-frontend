import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRows } from '../../src/features/indicadores/rows.ts';
const ind = (metricCode, scope, status, value, unit, reason = null, extra = {}) => ({ metricCode, scope, status, value, unit, numerator: null, denominator: null, sampleSize: 0, unavailabilityReason: reason, ...extra });
const s = (id, at, indicators, extra = {}) => ({ sessionId: id, occurredAt: at, attemptNumber: 1, executionStatus: 'COMPLETED', processingStatus: 'COMPLETED', configVersion: 1, incidentCount: 0, rule: { version: 1, approval: { current: 'PROPOSED' } }, detailAccess: 'AVAILABLE', indicators, ...extra });
const list = [
  s('c', '2026-05-20T15:00:00Z', [ind('accuracy_pct', 'SESSION', 'NOT_AVAILABLE', null, '%', 'SEGMENT_NOT_REACHED'), ind('accuracy_pct', 'SEGMENT_1', 'CALCULATED', 50, '%')], { executionStatus: 'INTERRUPTED', detailAccess: 'UNAVAILABLE' }),
  s('b', '2026-04-10T15:00:00Z', [ind('accuracy_pct', 'SESSION', 'CALCULATED', 0, '%', null, { numerator: 0, denominator: 10 })], { configVersion: 2 }),
  s('a', '2026-03-02T15:00:00Z', [ind('accuracy_pct', 'SESSION', 'CALCULATED', 80, '%', null, { numerator: 8, denominator: 10 })]),
  s('p', '2026-02-01T15:00:00Z', [], { processingStatus: 'FAILED' }),
];
test('una fila por sesión e indicador del alcance elegido; el cero calculado se imprime como cero y lo ausente como guion con motivo', () => {
  const rows = buildRows(list, 'accuracy_pct', 'SESSION');
  assert.deepEqual(rows.map(r => r.sessionId), ['c', 'b', 'a', 'p']);
  assert.equal(rows[1].value, '0 %'); assert.equal(rows[1].missing, false); assert.equal(rows[1].used, '0 de 10');
  assert.equal(rows[0].value, '—'); assert.match(rows[0].reason, /Segmento no alcanzado/); assert.equal(rows[0].used, '—');
  assert.equal(rows[3].value, '—'); assert.match(rows[3].reason, /fallido/i);
});
test('condiciones distintas frente a la sesión anterior, interrupción como no comparable y enlace solo con acceso', () => {
  const rows = buildRows(list, 'accuracy_pct', 'SESSION');
  assert.equal(rows[0].differs, true); assert.equal(rows[0].interrupted, true); assert.equal(rows[1].differs, true); assert.equal(rows[2].differs, false); assert.equal(rows[3].differs, false);
  assert.equal(rows[0].detailAccess, 'UNAVAILABLE'); assert.equal(rows[2].detailAccess, 'AVAILABLE');
});
test('alcance elegido y todos los indicadores: solo ese alcance; una sesión sin indicadores no desaparece', () => {
  const rows = buildRows(list, 'all', 'SEGMENT_1');
  assert.equal(rows.find(r => r.sessionId === 'c').value, '50 %'); assert.equal(rows.filter(r => r.sessionId === 'b').length, 1); assert.equal(rows.find(r => r.sessionId === 'b').missing, true);
  assert.equal(buildRows([], 'all', 'SESSION').length, 0);
});
