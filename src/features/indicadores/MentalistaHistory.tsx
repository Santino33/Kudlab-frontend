import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '../usuarios/hooks';
import { Loading, Notice } from '../usuarios/shared';
import { executionLabels, processingLabels, studentTasksPath } from '../tareas/activities/types';
import { mentalistaMetrics, mentalistaScopes, mentalistaReasons, mentalistaGlobalOnly, type MentalistaMetric, type MentalistaScope } from '../tareas/activities/mentalista-types';
import { navigate } from '../../lib/navigation';
import { filterError, type IndicatorsApi, type MentalistaHistoryFilter } from './api';
import { longDate } from './format';
import { PedagogicalNotice } from './PedagogicalNotice';
import { DETAIL_UNAVAILABLE } from './copy';

type Props = { api: IndicatorsApi; studentId: string; studentName: string; groupId: string; onRevalidate(): void };
const defaults: MentalistaHistoryFilter = { taskId: 'TG-03', scope: 'SESSION' };
const format = (n: number, unit: string) => `${n.toLocaleString('es-CO', { minimumFractionDigits: unit === 'count' ? 0 : 1, maximumFractionDigits: unit === 'count' ? 0 : 1 })} ${unit === 'points' ? 'puntos' : unit === 'count' ? 'selecciones' : unit}`;
export function MentalistaHistory(props: Props) {
  const [filter, setFilter] = useState<MentalistaHistoryFilter>(defaults);
  const id = useId(), invalid = filterError(filter);
  return <div className="staff-stack"><p>{props.studentName} · Tarea TG-03 · Mentalista</p><PedagogicalNotice />
    <p>Registros individuales de cada ejecución, de la más reciente a la más antigua. No se establece equivalencia entre sesiones ni se calcula una tendencia.</p>
    <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros de Mentalista" onSubmit={e => e.preventDefault()}>
      <div className="grid gap-2"><Label htmlFor={`${id}-metric`}>Indicador</Label><select id={`${id}-metric`} className="staff-select" value={filter.metricCode ?? 'all'} onChange={e => { const metricCode = e.target.value === 'all' ? undefined : e.target.value as MentalistaMetric; setFilter(f => ({ ...f, metricCode, scope: metricCode && mentalistaGlobalOnly(metricCode) ? 'SESSION' : f.scope })); }}><option value="all">Todos los indicadores</option>{Object.entries(mentalistaMetrics).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-scope`}>Alcance</Label><select id={`${id}-scope`} className="staff-select" value={filter.scope} onChange={e => setFilter(f => ({ ...f, scope: e.target.value as MentalistaScope }))}>{mentalistaScopes.filter(s => !filter.metricCode || !mentalistaGlobalOnly(filter.metricCode) || s === 'SESSION').map(s => <option key={s} value={s}>{s === 'SESSION' ? 'Global' : `Carga ${s.slice(-1)}`}</option>)}</select></div>
      {(['from', 'to'] as const).map(field => <div key={field} className="grid gap-2"><Label htmlFor={`${id}-${field}`}>{field === 'from' ? 'Desde' : 'Hasta'}</Label><Input id={`${id}-${field}`} type="date" value={filter[field] ?? ''} aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? `${id}-error` : undefined} onChange={e => setFilter(f => ({ ...f, [field]: e.target.value || undefined }))} /></div>)}
      <Button type="button" variant="outline" onClick={() => setFilter(defaults)}>Quitar los filtros</Button>
    </form>
    {invalid ? <p id={`${id}-error`} role="alert">Revisa las fechas y el alcance: la fecha inicial debe ser anterior o igual a la final.</p> : <HistoryPage key={JSON.stringify(filter)} {...props} filter={filter} />}
    <a className="staff-link" href="/indicadores" onClick={navigate}>Ver el catálogo de indicadores</a>
  </div>;
}
function HistoryPage({ api, studentId, groupId, filter, onRevalidate }: Props & { filter: MentalistaHistoryFilter }) {
  const [cursor, setCursor] = useState<string>();
  const query = useQuery(signal => api.mentalistaHistory(studentId, filter, signal, cursor), `${studentId}:${JSON.stringify(filter)}:${cursor ?? ''}`);
  if (!query.result) return <Loading text="Consultando indicadores de Mentalista" />;
  if (query.result.kind !== 'success') {
    const denied = query.result.kind === 'error' && [401, 403, 404].includes(query.result.status);
    return <Notice title={denied ? 'No disponible con tu acceso actual' : 'No pudimos cargar la historia'}><p>{denied ? 'Revisa el acceso actual al estudiante.' : 'No se muestran datos parciales. Puedes volver a consultar.'}</p><Button variant="outline" onClick={denied ? onRevalidate : query.reload}>{denied ? 'Revisar acceso al estudiante' : 'Reintentar'}</Button></Notice>;
  }
  const page = query.result.data;
  return <section className="staff-stack" aria-label="Historia de Mentalista">
    {!page.items.length ? <p role="status">No hay sesiones para estos filtros. La ausencia de registros no equivale a cero.</p> : page.items.map(s => <section key={s.sessionId} className="staff-stack" aria-labelledby={`history-${s.sessionId}`}>
      <h2 id={`history-${s.sessionId}`} className="staff-section-title">{longDate(s.occurredAt)} · Intento {s.attemptNumber ?? 'sin consumir'}</h2>
      <p>{executionLabels[s.executionStatus]} · {processingLabels[s.processingStatus]}. Ítems registrados: {s.recordedTrialCount}; incidencias: {s.incidentCount}.</p>
      <p>Configuración v{s.configVersion} · Banco {s.mentalista.configuration.bank.itemBankVersion} · {s.mentalista.gameBuildId} · Regla {s.rule ? `${s.rule.code} v${s.rule.version} (${s.approvalAtCalculation === 'APPROVED' ? 'aprobada al calcular' : 'sin aprobación al calcular'})` : 'sin cálculo'}.</p>
      {s.mentalista.device && <p>Presentación: {s.mentalista.device.viewportWidth} × {s.mentalista.device.viewportHeight}, {s.mentalista.device.layoutPreset === 'portrait' ? 'vertical' : 'horizontal'}. Práctica: {s.mentalista.preparation?.practice.length ?? 0} rondas, separadas de la medición.</p>}
      {!s.indicators.length ? <p>Sin indicadores disponibles en esta consulta.</p> : <div className="staff-table-region" role="region" aria-label={`Indicadores del intento ${s.attemptNumber ?? 'sin consumir'}`} tabIndex={0}><Table><TableCaption>Resultados descriptivos · {filter.scope === 'SESSION' ? 'global' : `carga ${filter.scope?.slice(-1)}`}</TableCaption><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">n</TableHead><TableHead>Datos usados / motivo</TableHead></TableRow></TableHeader><TableBody>{s.indicators.map(i => <TableRow key={`${i.metricCode}:${i.scope}`}><TableCell>{mentalistaMetrics[i.metricCode]}</TableCell><TableCell className="text-right tabular-nums">{i.value === null ? '—' : format(i.value, i.unit)}</TableCell><TableCell className="text-right tabular-nums">{i.sampleSize}</TableCell><TableCell>{i.unavailabilityReason ? mentalistaReasons[i.unavailabilityReason] : i.numerator !== null && i.denominator !== null ? `${i.numerator} / ${i.denominator}` : 'Según población de la ficha del indicador'}</TableCell></TableRow>)}</TableBody></Table></div>}
      <details><summary>Identidad de configuración y secuencia</summary><p className="break-all">Configuración: {s.mentalista.configurationHash}</p><p className="break-all">Banco: {s.mentalista.configuration.bankHash}</p><p className="break-all">Secuencia: {s.mentalista.configuration.sequenceHash}</p></details>
      {s.detailAccess === 'AVAILABLE' ? <a className="staff-link" href={studentTasksPath(groupId, studentId, s.sessionId)} onClick={navigate}>Ver sesión</a> : <p>{DETAIL_UNAVAILABLE}</p>}
    </section>)}
    <div className="staff-actions">{cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Primera página</Button>}{page.nextCursor && <Button variant="outline" onClick={() => setCursor(page.nextCursor!)}>Página siguiente</Button>}</div>
    <p>{page.nextCursor ? 'Hay más sesiones; esta página no es toda la historia.' : 'Fin de las sesiones que coinciden con los filtros.'}</p>
  </section>;
}
