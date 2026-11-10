import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, niceMax, place, DEFAULT_LAYOUT } from '../../src/features/indicadores/chart-model.ts';
import { dataUsed, formatValue, missingReason } from '../../src/features/indicadores/format.ts';
const ind = (metricCode, scope, status, value, unit, reason = null, extra = {}) => ({ metricCode, scope, status, value, unit, numerator: null, denominator: null, sampleSize: 0, unavailabilityReason: reason, ...extra });
const session = (id, at, indicators, extra = {}) => ({ sessionId: id, occurredAt: at, executionStatus: 'COMPLETED', processingStatus: 'COMPLETED', configVersion: 1, rule: { version: 1 }, indicators, ...extra });
const newestFirst = [
  session('c', '2026-05-20T15:00:00Z', [ind('accuracy_pct', 'SESSION', 'NOT_AVAILABLE', null, '%', 'SEGMENT_NOT_REACHED')], { executionStatus: 'INTERRUPTED' }),
  session('b', '2026-04-10T15:00:00Z', [ind('accuracy_pct', 'SESSION', 'CALCULATED', 0, '%')], { configVersion: 2 }),
  session('a', '2026-03-02T15:00:00Z', [ind('accuracy_pct', 'SESSION', 'CALCULATED', 80, '%')]),
  session('p', '2026-02-01T15:00:00Z', [], { processingStatus: 'PENDING' }),
];
test('orden cronológico, eje % fijo 0–100 y «sin dato» nunca en cero', () => {
  const m = buildChart(newestFirst, 'accuracy_pct', 'SESSION');
  assert.deepEqual(m.points.map(p => p.sessionId), ['p', 'a', 'b', 'c']); assert.equal(m.unit, '%'); assert.equal(m.max, 100); assert.deepEqual(m.ticks, [0, 25, 50, 75, 100]);
  assert.deepEqual(m.points.map(p => p.kind), ['missing', 'value', 'value', 'missing']);
  assert.equal(m.points[0].value, null); assert.match(m.points[0].reason, /pendiente/i); assert.match(m.points[3].reason, /Segmento no alcanzado/);
  assert.equal(m.points[2].value, 0); assert.equal(m.points[2].kind, 'value'); // un cero calculado sigue siendo un valor
  assert.equal(m.points[3].interrupted, true);
});
test('colocación: los valores dentro del eje, el cero calculado en la base y los ausentes en la franja separada', () => {
  const placed = place(buildChart(newestFirst, 'accuracy_pct', 'SESSION'));
  const [p, a, b, c] = placed;
  assert.equal(a.y < DEFAULT_LAYOUT.plotBottom, true); assert.equal(b.y, DEFAULT_LAYOUT.plotBottom);
  assert.equal(p.y, DEFAULT_LAYOUT.missingY); assert.equal(c.y, DEFAULT_LAYOUT.missingY); assert.ok(DEFAULT_LAYOUT.missingY > DEFAULT_LAYOUT.plotBottom);
  assert.ok(placed.every((q, i) => i === 0 || q.x > placed[i - 1].x)); assert.ok(placed.every(q => q.x > DEFAULT_LAYOUT.left && q.x < DEFAULT_LAYOUT.width - DEFAULT_LAYOUT.right));
});
test('forma del marcador por condición (regla y configuración), no solo color', () => {
  const m = buildChart(newestFirst, 'accuracy_pct', 'SESSION');
  assert.equal(m.conditions.length, 2); assert.notEqual(m.points[1].shape, m.points[2].shape); assert.equal(m.points[1].shape, m.points[0].shape);
  assert.match(m.conditions[0].label, /Regla v1 · Configuración v1/);
});
test('ms: eje desde 0 hasta un máximo redondeado sin recortar', () => {
  assert.equal(niceMax(500), 1000); assert.equal(niceMax(163.3), 200); assert.equal(niceMax(0), 1); assert.ok(niceMax(1234) >= 1234 * 1.1);
  const m = buildChart([session('a', '2026-03-02T15:00:00Z', [ind('median_reaction_time_ms', 'SESSION', 'CALCULATED', 500, 'ms')])], 'median_reaction_time_ms', 'SESSION');
  assert.equal(m.unit, 'ms'); assert.equal(m.ticks[0], 0); assert.ok(m.max >= 500);
});
test('sin sesiones o con una sola sesión no rompe; el formato usa unidad y no inventa valores', () => {
  assert.equal(buildChart([], 'rt_cv_pct', 'SESSION').points.length, 0); assert.equal(buildChart([newestFirst[2]], 'accuracy_pct', 'SESSION').xLabels.length, 1);
  assert.equal(formatValue(66.666, '%'), '66,7 %'); assert.equal(formatValue(null, 'ms'), '—'); assert.equal(formatValue(0, '%'), '0 %');
  assert.equal(dataUsed({ numerator: 8, denominator: 10, sampleSize: 10 }), '8 de 10'); assert.equal(dataUsed({ numerator: null, denominator: null, sampleSize: 1 }), '1 respuesta válida');
  assert.match(missingReason(newestFirst[3]), /pendiente/i);
});
