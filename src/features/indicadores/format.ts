import { metricLabels, processingLabels, unavailableLabels } from './copy.ts';
import type { HistoryIndicator, HistorySession, MetricCode } from './types.ts';

const TIME_ZONE = 'America/Bogota';
export const formatValue = (value: number | null, unit: '%' | 'ms') => value === null ? '—' : `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)} ${unit}`;
export const longDate = (iso: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(new Date(iso));
export const shortDate = (iso: string) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: TIME_ZONE }).format(new Date(iso)).replace('.', '');

// Motivo comprensible de un valor ausente: el del indicador o, sin ejecución vigente, el estado de procesamiento. Nunca un cero.
export function missingReason(session: HistorySession, indicator?: HistoryIndicator): string {
  if (indicator?.unavailabilityReason) return unavailableLabels[indicator.unavailabilityReason] ?? 'No disponible';
  return processingLabels[session.processingStatus];
}
export const metricLabel = (code: MetricCode) => metricLabels[code] ?? code;
export const isInterrupted = (s: HistorySession) => s.executionStatus === 'INTERRUPTED' || s.executionStatus === 'UNCONFIRMED' || s.executionStatus === 'EXPIRED';
export const conditionKey = (s: HistorySession) => `${s.rule?.version ?? '?'}|${s.configVersion}`;
export const conditionLabel = (s: HistorySession) => `Regla v${s.rule?.version ?? '—'} · Configuración v${s.configVersion}`;

// «Datos usados / total»: numerador y denominador si existen; en los tiempos, el número de respuestas válidas.
export function dataUsed(i: HistoryIndicator): string {
  if (i.numerator !== null && i.denominator !== null) return `${i.numerator} de ${i.denominator}`;
  return i.sampleSize === 1 ? '1 respuesta válida' : `${i.sampleSize} respuestas válidas`;
}
