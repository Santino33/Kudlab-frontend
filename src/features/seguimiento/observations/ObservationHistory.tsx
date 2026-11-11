import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ObservationsApi } from './api.ts';
import { areas, behaviors, date, frequencies, integer } from './types.ts';
import type { Filters, Observation, Page, Revision } from './types.ts';
import { selectClass } from './ObservationForm';

export const recorded = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
function RevisionFacts({ revision }: { revision: Revision }) {
  return <dl className="grid gap-2 text-sm sm:grid-cols-2">
    <div><dt className="text-muted">Conducta y frecuencia</dt><dd>{behaviors[revision.behavior]} · {frequencies[revision.frequency]}</dd></div>
    <div><dt className="text-muted">Fecha observada</dt><dd>{revision.observedOn}</dd></div>
    <div><dt className="text-muted">Año lectivo y periodo</dt><dd>{revision.schoolYear} · Periodo {revision.term}</dd></div>
    <div><dt className="text-muted">Área</dt><dd>{revision.area ? areas[revision.area] : 'Sin especificar'}</dd></div>
  </dl>;
}
export function ObservationHistory({ api, studentId, revision, valid, lost, correct, canWrite }: {
  api: ObservationsApi; studentId: string; revision: number; valid(): boolean; lost(): void; correct(observation: Observation): void; canWrite: boolean;
}) {
  const [fields, setFields] = useState({ schoolYear: '', term: '', behavior: '', area: '', observedFrom: '', observedTo: '' });
  const [filters, setFilters] = useState<Filters>({}), [filterError, setFilterError] = useState('');
  const [data, setData] = useState<Page<Observation>>(), [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [reload, setReload] = useState(0), [requestCursor, setRequestCursor] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<{ at: string; filters: Filters }>();
  const [selected, setSelected] = useState<string>();
  const source = useRef({ valid, lost }); source.current = { valid, lost };
  const seq = useRef(0), active = useRef<AbortController | undefined>(undefined), used = useRef(new Set<string>());
  function refresh() { setRequestCursor(null); used.current.clear(); setReload(n => n + 1); }
  useEffect(() => { refresh(); setSelected(undefined); }, [revision]);
  useEffect(() => {
    const request = new AbortController(), count = ++seq.current; active.current?.abort(); active.current = request; setState('loading');
    void api.history(studentId, filters, requestCursor, request.signal).then(result => {
      if (request.signal.aborted || count !== seq.current || !source.current.valid()) return;
      if (result.kind === 'success') {
        if (result.data.nextCursor && (result.data.nextCursor === requestCursor || used.current.has(result.data.nextCursor))) { setState('unavailable'); return; }
        if (requestCursor) used.current.add(requestCursor);
        setData(old => ({ items: requestCursor && old ? [...old.items, ...result.data.items.filter(item => !old.items.some(o => o.id === item.id))] : result.data.items, nextCursor: result.data.nextCursor })); setLastSuccess({ at: new Date().toISOString(), filters }); setState('ready');
      } else {
        setState('unavailable');
        if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { setData(undefined); source.current.lost(); }
      }
    });
    return () => request.abort();
  }, [api, studentId, filters, requestCursor, reload]);
  function apply() {
    if (fields.schoolYear && (!/^-?\d+$/.test(fields.schoolYear) || !integer(Number(fields.schoolYear))) ||
      fields.observedFrom && !date(fields.observedFrom) || fields.observedTo && !date(fields.observedTo) || fields.observedFrom && fields.observedTo && fields.observedFrom > fields.observedTo) {
      setFilterError('Revisa el año lectivo y el rango inclusivo de fechas.'); return;
    }
    setFilterError(''); setRequestCursor(null); used.current.clear();
    setFilters({ ...(fields.schoolYear ? { schoolYear: Number(fields.schoolYear) } : {}), ...(fields.term ? { term: Number(fields.term) } : {}),
      ...(fields.behavior ? { behavior: fields.behavior as Filters['behavior'] } : {}), ...(fields.area ? { area: fields.area as Filters['area'] } : {}),
      ...(fields.observedFrom ? { observedFrom: fields.observedFrom } : {}), ...(fields.observedTo ? { observedTo: fields.observedTo } : {}) });
    setSelected(undefined);
  }
  return <section aria-labelledby="observation-history-title" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="observation-history-title" className="text-xl font-semibold min-w-0 [overflow-wrap:anywhere]">Historial de observaciones</h3><Button type="button" variant="outline" disabled={state === 'loading'} onClick={refresh}>Actualizar historial</Button></div>
    <p className="text-sm text-muted">Ordenado por registro original, del más reciente al más antiguo. Las correcciones no cambian ese orden.</p>
    <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-medium">Filtrar historial</summary>
      <form noValidate className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); apply(); }}>
        <div className="grid gap-4 sm:grid-cols-2">{Object.entries({ schoolYear: 'Año lectivo', term: 'Periodo académico', behavior: 'Conducta', area: 'Área', observedFrom: 'Fecha observada desde', observedTo: 'Fecha observada hasta' }).map(([key, label]) => {
          const field = key as keyof typeof fields, choices = field === 'term' ? { 1: 'Periodo 1', 2: 'Periodo 2', 3: 'Periodo 3', 4: 'Periodo 4' } : field === 'behavior' ? behaviors : field === 'area' ? { ...areas, UNSPECIFIED: 'Sin especificar' } : undefined;
          return <div className="space-y-2 min-w-0" key={key}><Label htmlFor={`history-${key}`}>{label}</Label>
            {choices ? <select id={`history-${key}`} className={selectClass} value={fields[field]} onChange={e => setFields({ ...fields, [field]: e.target.value })}><option value="">Todos</option>{Object.entries(choices).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select> :
              <Input id={`history-${key}`} type={key === 'schoolYear' ? 'number' : 'date'} value={fields[field]} onChange={e => setFields({ ...fields, [field]: e.target.value })} />}</div>;
        })}</div>
        {filterError && <p role="alert">{filterError}</p>}
        <div className="flex flex-wrap gap-3"><Button type="submit" variant="outline">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { setFields({ schoolYear: '', term: '', behavior: '', area: '', observedFrom: '', observedTo: '' }); setFilters({}); setRequestCursor(null); used.current.clear(); setFilterError(''); setSelected(undefined); }}>Quitar filtros</Button></div>
      </form>
    </details>
    <div role="status">{state === 'loading' ? 'Consultando historial…' : state === 'unavailable' ? 'No se pudo actualizar. La última consulta mostrada no acredita el estado actual ni la ausencia de registros.' : !data?.items.length ? 'No hay observaciones para esta consulta.' : `${data.items.length} observaciones consultadas.`}</div>
    {state === 'unavailable' && <Button variant="outline" onClick={refresh}>Reintentar historial</Button>}
    {lastSuccess && <p className="text-sm text-muted">Última consulta confirmada: {recorded(lastSuccess.at)} (Colombia). {Object.keys(lastSuccess.filters).length ? `Filtros de esos resultados: ${Object.entries(lastSuccess.filters).map(([key, value]) => `${({ schoolYear: 'año', term: 'periodo', behavior: 'conducta', area: 'área', observedFrom: 'desde', observedTo: 'hasta' } as Record<string, string>)[key]} ${key === 'behavior' ? behaviors[value as keyof typeof behaviors] : key === 'area' ? areas[value as keyof typeof areas] ?? 'Sin especificar' : value}`).join(' · ')}` : 'Sin filtros.'}</p>}
    <ol className="divide-y divide-border">{data?.items.map(item => <li key={item.id} className="py-5 space-y-4">
      <header className="space-y-1"><h4 className="font-semibold">{behaviors[item.revision.behavior]} · {frequencies[item.revision.frequency]}</h4>
        <p className="text-sm break-words">{item.author.name} · Registro original: {recorded(item.createdAt)} (Colombia)</p></header>
      <RevisionFacts revision={item.revision} />
      <p className="text-sm text-muted">Versión vigente consultada: {item.version} · Revisión registrada: {recorded(item.revision.recordedAt)} (Colombia)</p>
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => setSelected(selected === item.id ? undefined : item.id)}>{selected === item.id ? 'Cerrar cambios' : 'Ver original y cambios'}</Button>
        <Button type="button" variant="outline" disabled={!canWrite || state !== 'ready'} onClick={() => correct(item)}>Preparar corrección</Button></div>
      {selected === item.id && <Revisions {...{ api, studentId, valid, lost }} observationId={item.id} />}
    </li>)}</ol>
    {data?.nextCursor && <Button type="button" variant="outline" disabled={state !== 'ready'} onClick={() => setRequestCursor(data.nextCursor)}>Ver registros anteriores</Button>}
  </section>;
}
function Revisions({ api, studentId, observationId, valid, lost }: { api: ObservationsApi; studentId: string; observationId: string; valid(): boolean; lost(): void }) {
  const [data, setData] = useState<Page<Revision> & { authorName: string }>(), [cursor, setCursor] = useState<string | null>(null), [state, setState] = useState('loading'), [reload, setReload] = useState(0);
  const source = useRef({ valid, lost }); source.current = { valid, lost };
  const used = useRef(new Set<string>());
  useEffect(() => {
    const request = new AbortController(); setState('loading');
    void api.revisions(studentId, observationId, cursor, request.signal).then(result => {
      if (request.signal.aborted || !source.current.valid()) return;
      if (result.kind === 'success' && (result.data.nextCursor === null || result.data.nextCursor !== cursor && !used.current.has(result.data.nextCursor))) {
        if (cursor) used.current.add(cursor);
        setData(old => ({ authorName: result.data.observation.author.name, items: cursor && old ? [...old.items, ...result.data.items.filter(item => !old.items.some(o => o.version === item.version))] : result.data.items, nextCursor: result.data.nextCursor })); setState('ready');
      } else { setState('unavailable'); if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { setData(undefined); source.current.lost(); } }
    }); return () => request.abort();
  }, [api, studentId, observationId, cursor, reload]);
  return <div className="rounded-lg bg-surface-subtle p-4 space-y-4">
    <h5 className="font-semibold">Original y correcciones</h5>
    {state !== 'ready' && <p role="status">{state === 'loading' ? 'Consultando cambios…' : 'Los cambios no están actualizados.'}</p>}
    {state === 'unavailable' && <Button variant="outline" onClick={() => setReload(n => n + 1)}>Reintentar cambios</Button>}
    <ol className="space-y-5">{data?.items.map(item => <li key={item.id} className="space-y-2"><p className="font-medium">{item.version === 1 ? 'Original' : `Corrección · Versión ${item.version}`} · {recorded(item.recordedAt)} (Colombia)</p><RevisionFacts revision={item} /><p className="text-sm break-words">Autor de la revisión: {data.authorName}</p></li>)}</ol>
    {data?.nextCursor && <Button variant="outline" disabled={state !== 'ready'} onClick={() => setCursor(data.nextCursor)}>Ver más cambios</Button>}
  </div>;
}
