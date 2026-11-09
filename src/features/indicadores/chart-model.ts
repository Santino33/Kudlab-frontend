import { conditionKey, conditionLabel, isInterrupted, missingReason, shortDate } from './format.ts';
import type { HistorySession, MetricCode, Scope } from './types.ts';
import { metricUnits } from './types.ts';

export type Point = { sessionId: string; at: string; index: number; kind: 'value' | 'missing'; value: number | null; reason: string | null; shape: number; condition: string; interrupted: boolean };
export type Condition = { key: string; shape: number; label: string };
export type ChartModel = { metricCode: MetricCode; scope: Scope; unit: '%' | 'ms'; max: number; ticks: number[]; points: Point[]; conditions: Condition[]; xLabels: { index: number; text: string }[] };
export type Placed = Point & { x: number; y: number };
export const SHAPES = ['circle', 'square', 'diamond', 'triangle'] as const;

// Eje y: `%` fijo 0–100; `ms` desde 0 hasta un máximo redondeado. Nunca se recorta el eje ni se parte de un valor distinto de cero.
export function niceMax(maxValue: number): number {
  const raw = Math.max(maxValue * 1.1, 1), magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(v => v >= raw)!;
}
export function buildChart(sessionsNewestFirst: readonly HistorySession[], metricCode: MetricCode, scope: Scope): ChartModel {
  const unit = metricUnits[metricCode], sessions = [...sessionsNewestFirst].reverse(); // orden cronológico, solo para dibujar
  const conditions: Condition[] = [];
  const points: Point[] = sessions.map((session, index) => {
    const key = conditionKey(session);
    let c = conditions.find(x => x.key === key);
    if (!c) { c = { key, shape: conditions.length % SHAPES.length, label: conditionLabel(session) }; conditions.push(c); }
    const indicator = session.indicators.find(i => i.metricCode === metricCode && i.scope === scope);
    const value = indicator?.status === 'CALCULATED' ? indicator.value : null;
    return { sessionId: session.sessionId, at: session.occurredAt, index, kind: value === null ? 'missing' : 'value', value,
      reason: value === null ? missingReason(session, indicator) : null, shape: c.shape, condition: c.label, interrupted: isInterrupted(session) };
  });
  const max = unit === '%' ? 100 : niceMax(Math.max(0, ...points.map(p => p.value ?? 0)));
  const labelCount = Math.min(points.length, 6), step = labelCount > 1 ? (points.length - 1) / (labelCount - 1) : 0;
  const indexes = labelCount ? [...new Set(Array.from({ length: labelCount }, (_, k) => Math.round(k * step)))] : [];
  return { metricCode, scope, unit, max, ticks: [0, .25, .5, .75, 1].map(f => f * max), points, conditions, xLabels: indexes.map(index => ({ index, text: shortDate(points[index]!.at) })) };
}
export type Layout = { width: number; height: number; left: number; right: number; top: number; plotBottom: number; missingY: number };
export const DEFAULT_LAYOUT: Layout = { width: 640, height: 300, left: 64, right: 16, top: 16, plotBottom: 232, missingY: 262 };
// Eje x ordinal: el espaciado entre sesiones no sugiere ritmo ni tendencia. Sin dato: franja separada bajo el eje.
export function place(model: ChartModel, layout: Layout = DEFAULT_LAYOUT): Placed[] {
  const plotWidth = layout.width - layout.left - layout.right, plotHeight = layout.plotBottom - layout.top, n = Math.max(model.points.length, 1);
  return model.points.map(p => ({ ...p, x: layout.left + (p.index + .5) * plotWidth / n, y: p.value === null ? layout.missingY : layout.plotBottom - p.value / model.max * plotHeight }));
}
