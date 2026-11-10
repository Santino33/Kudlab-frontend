import { executionLabels } from './copy.ts';
import { conditionKey, dataUsed, formatValue, isInterrupted, metricLabel, missingReason } from './format.ts';
import type { HistorySession, MetricCode, Scope } from './types.ts';
import { metricCodes } from './types.ts';

export type Row = { key: string; sessionId: string; at: string; attempt: number | null; indicator: string; value: string; missing: boolean; reason: string | null; used: string;
  rule: string; config: number; incidents: number; finalization: string; interrupted: boolean; differs: boolean; detailAccess: 'AVAILABLE' | 'UNAVAILABLE' };

// Una fila por sesión e indicador (alcance elegido). Sin indicadores (sin cálculo vigente) hay una fila con guion y el estado de procesamiento. Nunca un cero inventado.
export function buildRows(sessionsNewestFirst: readonly HistorySession[], metric: MetricCode | 'all', scope: Scope): Row[] {
  const rows: Row[] = [];
  sessionsNewestFirst.forEach((s, i) => {
    const older = sessionsNewestFirst[i + 1];
    // «Condiciones distintas» frente a la sesión anterior cargada: regla/configuración, incidencias o interrupción.
    const differs = older !== undefined && (conditionKey(s) !== conditionKey(older) || (s.incidentCount > 0) !== (older.incidentCount > 0) || isInterrupted(s) !== isInterrupted(older));
    const base = { sessionId: s.sessionId, at: s.occurredAt, attempt: s.attemptNumber, rule: s.rule ? `v${s.rule.version} · ${s.rule.approval.current === 'APPROVED' ? 'aprobada' : 'propuesta'}` : '—',
      config: s.configVersion, incidents: s.incidentCount, finalization: executionLabels[s.executionStatus], interrupted: isInterrupted(s), differs, detailAccess: s.detailAccess };
    const wanted = s.indicators.filter(x => x.scope === scope && (metric === 'all' || x.metricCode === metric))
      .sort((a, b) => metricCodes.indexOf(a.metricCode) - metricCodes.indexOf(b.metricCode));
    if (!wanted.length) rows.push({ ...base, key: `${s.sessionId}:none`, indicator: metric === 'all' ? '—' : metricLabel(metric), value: '—', missing: true, reason: missingReason(s), used: '—' });
    for (const x of wanted) rows.push({ ...base, key: `${s.sessionId}:${x.metricCode}`, indicator: metricLabel(x.metricCode), missing: x.status !== 'CALCULATED',
      value: x.status === 'CALCULATED' ? formatValue(x.value, x.unit) : '—', reason: x.status === 'CALCULATED' ? null : missingReason(s, x), used: x.status === 'CALCULATED' ? dataUsed(x) : '—' });
  });
  return rows;
}
