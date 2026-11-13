import { useEffect, useId, useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Loading, Notice } from '../usuarios/shared';
import { navigate } from '../../lib/navigation.ts';
import { studentTasksPath } from '../tareas/activities/types.ts';
import { filterError, type HistoryFilter, type IndicatorsApi } from './api.ts';
import { buildChart } from './chart-model.ts';
import { COMPARABILITY_NOTE, DETAIL_UNAVAILABLE, SCOPE_LABELS } from './copy.ts';
import { longDate, metricLabel } from './format.ts';
import { initialState, reduce, staleView, type HistoryState } from './history-state.ts';
import { Heading } from './IndicatorCatalog';
import { IndicatorChart } from './IndicatorChart';
import { PedagogicalNotice } from './PedagogicalNotice';
import { buildRows } from './rows.ts';
import { metricCodes, scopes, type MetricCode, type Scope } from './types.ts';

type Filters = { metric: MetricCode | 'all'; scope: Scope; from: string; to: string };
const defaults: Filters = { metric: 'all', scope: 'SESSION', from: '', to: '' };
const select = 'staff-select font-medium';
const toFilter = (f: Filters): HistoryFilter => ({ ...(f.metric !== 'all' ? { metricCode: f.metric } : {}), scope: f.scope, ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}) });
const describe = (f: HistoryFilter) => [f.metricCode ? metricLabel(f.metricCode) : 'todos los indicadores', f.scope ? SCOPE_LABELS[f.scope] : '', f.from ? `desde ${f.from}` : '', f.to ? `hasta ${f.to}` : ''].filter(Boolean).join(', ');
const rangeText = (f: Filters) => f.from || f.to ? `${f.from || 'inicio'} a ${f.to || 'hoy'}` : 'todas las fechas';
const rangeMessages = { range: 'La fecha inicial no puede ser posterior a la final. No se consulta hasta corregirla.', date: 'Escribe fechas reales con el formato del selector.', metric: 'Indicador no válido.', scope: 'Alcance no válido.' };

// Historia descriptiva de indicadores de un estudiante (D-1…D-8). Solo lectura; no compara ni calcula diferencias entre sesiones.
export function StudentIndicators({ api, studentId, studentName, groupId, onRevalidate }: { api: IndicatorsApi; studentId: string; studentName: string; groupId: string; onRevalidate(): void }) {
  const ids = { metric: useId(), scope: useId(), from: useId(), to: useId(), err: useId() };
  const [filters, setFilters] = useState<Filters>(defaults);
  const apiFilter = toFilter(filters), invalid = filterError(apiFilter), key = `${studentId}|${JSON.stringify(apiFilter)}`;
  const [state, dispatch] = useReducer(reduce, key, initialState);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (invalid) return;
    let active = true; const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15000);
    dispatch({ type: 'load', key, append: false });
    void api.history(studentId, apiFilter, abort.signal).then(result => { if (active) dispatch({ type: 'result', key, append: false, result }); }).finally(() => clearTimeout(timer));
    return () => { active = false; abort.abort(); clearTimeout(timer); };
  }, [key, revision, invalid]);
  const more = () => {
    if (!state.nextCursor || state.fetching) return;
    dispatch({ type: 'load', key, append: true });
    void api.history(studentId, apiFilter, new AbortController().signal, state.nextCursor).then(result => dispatch({ type: 'result', key, append: true, result }));
  };
  const change = (patch: Partial<Filters>) => setFilters(f => ({ ...f, ...patch }));
  const isDefault = filters.metric === defaults.metric && filters.scope === defaults.scope && !filters.from && !filters.to;
  return <div className="staff-stack">
    <Heading>Historia de indicadores</Heading>
    <p>{studentName} · Tarea TG-01</p>
    <PedagogicalNotice />
    <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros de la historia" onSubmit={e => e.preventDefault()}>
      <div className="grid gap-2"><Label htmlFor={ids.metric}>Indicador</Label>
        <select id={ids.metric} className={select} value={filters.metric} onChange={e => change({ metric: e.target.value as Filters['metric'] })}>
          <option value="all">Todos los indicadores</option>{metricCodes.map(m => <option key={m} value={m}>{metricLabel(m)}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor={ids.scope}>Alcance</Label>
        <select id={ids.scope} className={select} value={filters.scope} onChange={e => change({ scope: e.target.value as Scope })}>{scopes.map(s => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor={ids.from}>Desde</Label><Input id={ids.from} type="date" value={filters.from} aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? ids.err : undefined} onChange={e => change({ from: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor={ids.to}>Hasta</Label><Input id={ids.to} type="date" value={filters.to} aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? ids.err : undefined} onChange={e => change({ to: e.target.value })} /></div>
      <div className="sm:col-span-2 lg:col-span-4"><Button type="button" variant="outline" disabled={isDefault} onClick={() => setFilters(defaults)}>Quitar los filtros</Button></div>
    </form>
    {invalid && <p id={ids.err} role="alert" className="font-semibold">{rangeMessages[invalid]}</p>}
    {!invalid && <Content {...{ state, filters, studentName, groupId, studentId }} more={more} retry={() => setRevision(r => r + 1)} onRevalidate={onRevalidate} />}
    <p className="text-sm">{COMPARABILITY_NOTE}</p>
    <a className="w-fit font-semibold underline underline-offset-4" href="/indicadores" onClick={navigate}>Ver el catálogo de indicadores</a>
  </div>;
}

function Content({ state, filters, studentName, groupId, studentId, more, retry, onRevalidate }: { state: HistoryState; filters: Filters; studentName: string; groupId: string; studentId: string; more(): void; retry(): void; onRevalidate(): void }) {
  if (state.status === 'loading') return <Loading text="Consultando indicadores" />;
  if (state.status === 'error') {
    if (state.failure === 'denied' || state.failure === 'missing') return <Notice focus title="No disponible con tu acceso actual"><p>Ya no se muestra información de este estudiante. Si cambió el curso o el responsable, revisa tu acceso.</p>
      {state.failure === 'missing' && <Button variant="outline" className="mt-4" onClick={onRevalidate}>Revisar acceso al estudiante</Button>}</Notice>;
    if (state.failure === 'invalid') return <Notice title="Solicitud no válida"><p>Cambia los filtros e inténtalo de nuevo.</p></Notice>;
    const stale = staleView(state);
    return <>
      <Notice title="No se pudo actualizar"><p>{stale ? `Se muestran los datos de la última carga correcta, con los filtros anteriores (${describe(JSON.parse(stale.key.slice(stale.key.indexOf('|') + 1)))}).` : 'No se muestra información parcial.'}</p>
        <Button variant="outline" className="mt-4" onClick={retry}>Reintentar</Button></Notice>
      {stale && <Results items={stale.items} nextCursor={null} filters={filters} {...{ studentName, groupId, studentId }} more={() => undefined} moreFailed={false} fetching={false} dimmed />}
    </>;
  }
  if (state.status === 'empty') return <div className="grid gap-2 rounded-lg border border-border p-4" role="status"><p className="font-semibold">No hay sesiones para estos filtros</p>
    <p>{state.good && state.good.items.length ? 'Prueba con otro rango de fechas o quita los filtros.' : 'Este estudiante aún no tiene sesiones con indicadores en la tarea TG-01. Esto no es un error ni un resultado de cero.'}</p></div>;
  return <Results items={state.items} nextCursor={state.nextCursor} filters={filters} {...{ studentName, groupId, studentId }} more={more} moreFailed={state.moreFailed} fetching={state.fetching} />;
}

function Results({ items, nextCursor, filters, studentName, groupId, studentId, more, moreFailed, fetching, dimmed = false }: { items: HistoryState['items']; nextCursor: string | null; filters: Filters; studentName: string; groupId: string; studentId: string; more(): void; moreFailed: boolean; fetching: boolean; dimmed?: boolean }) {
  const rows = buildRows(items, filters.metric, filters.scope);
  return <div className={cn('grid gap-6', dimmed && 'opacity-80')}>
    {filters.metric === 'all' ? <p className="rounded-lg border border-border p-4">Elige un indicador para ver su gráfico. La tabla muestra todos los indicadores del alcance elegido.</p>
      : <IndicatorChart model={buildChart(items, filters.metric, filters.scope)} studentName={studentName} range={rangeText(filters)} />}
    <div className="staff-table-region" role="region" aria-label="Historia de indicadores por sesión" tabIndex={0}>
      <Table><TableCaption>{items.length} {items.length === 1 ? 'sesión cargada' : 'sesiones cargadas'}, de la más reciente a la más antigua. Fechas en hora de Colombia.</TableCaption>
        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Intento</TableHead><TableHead>Indicador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Datos usados</TableHead><TableHead>Regla</TableHead><TableHead>Configuración</TableHead><TableHead>Incidencias</TableHead><TableHead>Finalización</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map(r => <TableRow key={r.key}>
          <TableCell className="whitespace-nowrap"><time dateTime={r.at}>{longDate(r.at)}</time></TableCell><TableCell>{r.attempt ?? '—'}</TableCell><TableCell className="whitespace-nowrap">{r.indicator}</TableCell>
          <TableCell className="min-w-[12rem] text-right tabular-nums">{r.value}{r.reason && <span className="block text-left text-sm font-normal">{r.reason}</span>}</TableCell>
          <TableCell>{r.used}</TableCell><TableCell className="whitespace-nowrap">{r.rule}</TableCell><TableCell>v{r.config}{r.differs && <span className="block text-sm">Condiciones distintas</span>}</TableCell>
          <TableCell>{r.incidents}</TableCell><TableCell className="whitespace-nowrap">{r.finalization}{r.interrupted && <span className="block text-sm">No comparable</span>}</TableCell>
          <TableCell>{r.detailAccess === 'AVAILABLE' ? <a className="font-semibold underline underline-offset-4" href={studentTasksPath(groupId, studentId, r.sessionId)} onClick={navigate}>Ver sesión</a>
            : <span className="text-sm">{DETAIL_UNAVAILABLE}<span className="block">Sesión {r.sessionId.slice(0, 8)}</span></span>}</TableCell></TableRow>)}</TableBody></Table></div>
    {nextCursor ? <div className="grid gap-2"><p>Hay más sesiones. Lo mostrado no es toda la historia.</p>{moreFailed && <p role="alert" className="font-semibold">No pudimos cargar más sesiones; lo ya mostrado se conserva.</p>}
      <Button variant="outline" className="w-fit" disabled={fetching} onClick={more}>{fetching ? 'Cargando…' : 'Cargar más sesiones'}</Button></div> : <p className="text-sm">Se cargó toda la historia que coincide con los filtros.</p>}
  </div>;
}
