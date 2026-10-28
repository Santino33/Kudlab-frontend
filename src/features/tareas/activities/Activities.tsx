import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useQuery, useMutation } from '../../usuarios/hooks';
import { Loading, Notice } from '../../usuarios/shared';
import type { HttpResult } from '../../usuarios/types.ts';
import type { StudentsApi } from '../../academico/students/api.ts';
import type { TasksApi } from '../api.ts';
import type { Group } from '../../academico/groups/types.ts';
import { groupPath, go } from '../../academico/groups/navigation.ts';
import { navigate } from '../../../lib/navigation.ts';
import type { ActivitiesApi, AssignmentInput } from './api.ts';
import { object, assignmentPath, studentTasksPath, executionPath, executionLabels, processingLabels, metricLabels, unavailableLabels, type Assignment, type SessionDetail, type Evidence } from './types.ts';
import { AssignmentAccess, RecoveryAccess } from './AccessCodes';

export function ActivityLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} onClick={navigate} className={cn(buttonVariants({ variant: primary ? 'default' : 'outline' }), 'w-fit max-w-full whitespace-normal text-left [overflow-wrap:anywhere]')}>{children}</a>;
}
export function ActivityFailure({ result, retry }: { result?: HttpResult<unknown, string>; retry?(): void }) {
  return <Notice title={result?.kind === 'error' && result.status === 404 ? 'No encontramos el recurso o ya no tienes acceso' : 'No pudimos confirmar la operación'}>
    <p>{result?.kind === 'error' && result.status === 409 ? 'El estado actual no permite esta operación. Actualiza la asignación para revisar disponibilidad, participación e intentos.' : result?.kind === 'error' && result.status === 400 ? 'Revisa los datos y la configuración. No se ha confirmado la operación.' : 'Una respuesta perdida no demuestra que el cambio se haya deshecho. Conservamos la misma solicitud al reintentar.'}</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>Reintentar la misma solicitud</Button>}
  </Notice>;
}
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export function ActivityHeading({ children }: { children: ReactNode }) { return <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{children}</h1>; }
export function ActivityTable({ children, label, compactFirst = false }: { children: ReactNode; label: string; compactFirst?: boolean }) {
  return <><p className="text-sm sm:hidden">Puedes desplazar la tabla horizontalmente para consultar todas sus columnas.</p><div className={cn('staff-table-region', compactFirst && 'activity-evidence')} role="region" aria-label={label} tabIndex={0}><Table>{children}</Table></div></>;
}
function Next({ cursor, next }: { cursor: string | null; next(cursor: string): void }) { return cursor ? <Button variant="outline" className="w-fit" onClick={() => next(cursor)}>Página siguiente</Button> : null; }
export function Assignments({ api, studentsApi, tasksApi, group, actorId }: { api: ActivitiesApi; studentsApi: StudentsApi; tasksApi: TasksApi; group: Group; actorId: string }) {
  const [cursor, setCursor] = useState<string>();
  const [creating, setCreating] = useState(false);
  const query = useQuery(signal => api.assignments(group.id, signal, cursor), `${group.id}:${cursor ?? ''}`);
  return <div className="staff-stack">
    <ActivityLink href={groupPath(group.id)}>Volver al curso</ActivityLink>
    <header className="staff-heading"><div><ActivityHeading>Asignaciones</ActivityHeading><p>{group.name} · Destinatarios fijos de este curso</p></div><Button onClick={() => setCreating(v => !v)} variant={creating ? 'outline' : 'default'}>{creating ? 'Cerrar formulario' : 'Asignar actividad'}</Button></header>
    <p className="availability-note">Entrega técnica: solo participantes ficticios en una base aislada. Las tareas son apoyo pedagógico, no diagnóstico.</p>
    {creating && <AssignmentForm api={api} studentsApi={studentsApi} tasksApi={tasksApi} group={group} actorId={actorId} />}
    {!query.result ? <Loading text="Consultando asignaciones" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={query.reload} /> : !query.result.data.items.length ? <Notice title="Sin asignaciones"><p>No hay asignaciones en esta página. Puedes crear una actividad para destinatarios autorizados.</p></Notice> : <>
      <ActivityTable label="Asignaciones del curso"><TableCaption>Fechas en {Intl.DateTimeFormat().resolvedOptions().timeZone}</TableCaption><TableHeader><TableRow><TableHead>Actividad</TableHead><TableHead>Disponibilidad</TableHead><TableHead className="text-right">Destinatarios</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader><TableBody>{query.result.data.items.map(a => <TableRow key={a.id}><TableCell>{a.title}<p className="text-sm">Versión {a.configVersion}</p></TableCell><TableCell>{date(a.startsAt)} – {date(a.endsAt)}<p>{a.status === 'CANCELLED' ? 'Cancelada' : a.availability === 'CURRENT' ? 'Vigente' : a.availability === 'FUTURE' ? 'Próxima' : 'Vencida'}</p></TableCell><TableCell className="text-right tabular-nums">{a.recipientCount}</TableCell><TableCell><a className="staff-link" href={assignmentPath(group.id, a.id)} onClick={navigate}>Ver asignación</a></TableCell></TableRow>)}</TableBody></ActivityTable>
      <Next cursor={query.result.data.nextCursor} next={setCursor} />
    </>}
    <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar asignaciones</Button>{cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Primera página</Button>}</div>
  </div>;
}
function AssignmentForm({ api, studentsApi, tasksApi, group, actorId }: { api: ActivitiesApi; studentsApi: StudentsApi; tasksApi: TasksApi; group: Group; actorId: string }) {
  const studentQuery = useQuery(signal => studentsApi.list(signal), group.id), taskQuery = useQuery(signal => tasksApi.detail('TG-01', signal), 'TG-01');
  const [selected, setSelected] = useState<string[]>([]), [error, setError] = useState('');
  const key = `kudlab:j02:assignment:${actorId}:${group.id}`;
  const [frozen, setFrozen] = useState<AssignmentInput | undefined>(() => { try { const v = JSON.parse(sessionStorage.getItem(key) ?? 'null'); return v?.groupId === group.id && typeof v.requestId === 'string' ? v : undefined; } catch { return; } });
  const mutation = useMutation<Assignment>();
  const task = taskQuery.result?.kind === 'success' ? taskQuery.result.data : undefined;
  const students = studentQuery.result?.kind === 'success' ? studentQuery.result.data.items : undefined;
  async function send(input: AssignmentInput) {
    const result = await mutation.run(signal => api.create(input, signal));
    if (result?.kind === 'success') { sessionStorage.removeItem(key); go(assignmentPath(group.id, result.data.id)); }
    else if (result?.kind === 'error' && [400, 409].includes(result.status)) { sessionStorage.removeItem(key); setFrozen(undefined); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (mutation.pending || frozen || !task?.publishedVersion) return;
    const values = new FormData(event.currentTarget), start = new Date(String(values.get('startsAt'))), end = new Date(String(values.get('endsAt'))), maxAttempts = Number(values.get('maxAttempts'));
    if (!selected.length || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) { setError('Selecciona estudiantes, un periodo válido y entre 1 y 10 intentos.'); return; }
    const input: AssignmentInput = { requestId: crypto.randomUUID(), taskId: 'TG-01', publishedVersionId: task.publishedVersion.id, groupId: group.id, studentIds: selected, startsAt: start.toISOString(), endsAt: end.toISOString(), maxAttempts };
    try { sessionStorage.setItem(key, JSON.stringify(input)); } catch { setError('No podemos conservar la solicitud para reconciliarla. Habilita el almacenamiento de este sitio antes de guardar.'); return; }
    setError(''); setFrozen(input); void send(input);
  }
  return <section className="staff-stack activity-form" aria-labelledby="assignment-form-title"><h2 id="assignment-form-title" className="staff-section-title">Asignar Lluvia de estrellas</h2>
    <p>Los destinatarios quedan fijados al guardar. El límite de intentos lo decide el profesor; no es un umbral científico.</p>
    {frozen ? <Notice title="Hay una creación por confirmar"><p>{frozen.studentIds.length} destinatarios · {date(frozen.startsAt)} – {date(frozen.endsAt)} · {frozen.maxAttempts} intentos. Se consultará con la misma solicitud, sin crear otra asignación.</p><Button className="mt-4" disabled={mutation.pending} onClick={() => void send(frozen)}>{mutation.pending ? 'Comprobando asignación…' : 'Comprobar creación'}</Button></Notice> : !task || !students ? (!studentQuery.result || !taskQuery.result ? <Loading text="Preparando formulario" /> : <ActivityFailure retry={() => { studentQuery.reload(); taskQuery.reload(); }} />) : <form onSubmit={submit} className="auth-form">
      <p>{task.pedagogicalNotice}</p>{!task.assignable && <Notice title="Actividad no disponible"><ul>{task.unavailableReasons.map(r => <li key={r}>{r === 'METHODOLOGY_PENDING' ? 'Método pendiente de aprobación' : r === 'TASK_DISABLED' ? 'Tarea deshabilitada' : 'Configuración o integración pendiente'}</li>)}</ul></Notice>}
      <fieldset className="staff-stack" disabled={mutation.pending || !task.assignable}><legend className="font-semibold mb-3">Estudiantes destinatarios</legend>
        <Button type="button" variant="outline" className="w-fit" onClick={() => setSelected(students.map(s => s.id))}>Seleccionar todos los actuales</Button>
        {students.map(s => <label key={s.id} className="activity-choice"><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(old => e.target.checked ? [...old, s.id] : old.filter(id => id !== s.id))} /><span>{s.firstName} {s.lastName} · {s.studentCode}{!s.isActive && ' · Inactivo'}</span></label>)}
        {!students.length && <p>Este curso no tiene estudiantes.</p>}
        <p>{selected.length} destinatarios seleccionados. Incorporar estudiantes al curso después no cambiará esta lista.</p>
        <div className="auth-field"><Label htmlFor="assignment-start">Disponible desde</Label><Input id="assignment-start" name="startsAt" type="datetime-local" required /></div>
        <div className="auth-field"><Label htmlFor="assignment-end">Disponible hasta</Label><Input id="assignment-end" name="endsAt" type="datetime-local" required /></div>
        <p>Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}. El servidor comprobará la vigencia.</p>
        <div className="auth-field"><Label htmlFor="assignment-attempts">Máximo de intentos</Label><Input id="assignment-attempts" name="maxAttempts" type="number" min={1} max={10} step={1} required aria-describedby="assignment-attempts-help" /><p id="assignment-attempts-help">Entre 1 y 10. Abrir instrucciones no consume; comenzar con confirmación del servidor sí.</p></div>
      </fieldset><Button disabled={!task.assignable || !students.length || mutation.pending} type="submit">Guardar asignación</Button>
    </form>}
    {error && <p role="alert">{error}</p>}{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}
  </section>;
}
export function AssignmentDetail({ api, group, assignmentId, actorId }: { api: ActivitiesApi; group: Group; assignmentId: string; actorId: string }) {
  const query = useQuery(signal => api.assignment(assignmentId, signal), assignmentId);
  const a = query.result?.kind === 'success' && query.result.data.groupId === group.id ? query.result.data : undefined;
  const mutation = useMutation<Assignment>(), [requestId] = useState(() => operationId(`cancel:${actorId}:${assignmentId}`));
  async function cancel() { const result = await mutation.run(signal => api.cancel(assignmentId, requestId, signal)); if (result?.kind === 'success') query.reload(); }
  return <div className="staff-stack"><ActivityLink href={assignmentPath(group.id)}>Volver a asignaciones</ActivityLink><ActivityHeading>Detalle de asignación</ActivityHeading>
    {!query.result ? <Loading text="Consultando asignación" /> : !a ? <ActivityFailure result={query.result} retry={query.reload} /> : <>
      <section className="staff-stack"><h2 className="staff-section-title">{a.title} · Versión {a.configVersion}</h2><p>{date(a.startsAt)} – {date(a.endsAt)} · Zona {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><p>{a.maxAttempts} intentos por destinatario · {a.status === 'CANCELLED' ? 'Cancelada: no permite nuevos inicios' : 'Las condiciones y los destinatarios son inmutables'}</p></section>
      <AssignmentAccess api={api} assignment={a} groupName={group.name} actorId={actorId} />
      <ul className="activity-roster">{a.recipients.map(r => <li key={r.id}><div><h2 className="font-semibold">{r.studentDisplayName}</h2><p>{r.studentCode} · {r.attemptsStarted} de {a.maxAttempts} intentos iniciados</p>{r.unavailableReasons.map(reason => <p key={reason}>{unavailableLabels[reason]}</p>)}</div><div className="staff-actions"><ActivityLink href={studentTasksPath(group.id, r.studentId)}>Ver sesiones</ActivityLink>{r.canLaunch && <ActivityLink href={executionPath(`${assignmentPath(group.id, a.id)}/destinatarios/${r.id}/ejecucion`)}>Iniciar actividad supervisada</ActivityLink>}</div></li>)}</ul>
      <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar asignación</Button>{a.status === 'OPEN' && <AlertDialog><AlertDialogTrigger render={<Button variant="outline" />}>Cancelar nuevos inicios</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar nuevos inicios?</AlertDialogTitle><AlertDialogDescription>Se conservarán las sesiones, la evidencia y los destinatarios. No se podrán comenzar nuevas actividades de esta asignación.</AlertDialogDescription></AlertDialogHeader>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button onClick={() => void cancel()} disabled={mutation.pending}>{mutation.pending ? 'Cancelando…' : 'Cancelar nuevos inicios'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div>
    </>}
  </div>;
}
export function operationId(key: string) {
  const storageKey = `kudlab:j02:operation:${key}`;
  try { const old = sessionStorage.getItem(storageKey); if (old && /^[a-f0-9-]{36}$/.test(old)) return old; const id = crypto.randomUUID(); sessionStorage.setItem(storageKey, id); return id; }
  catch { return crypto.randomUUID(); }
}
export function StudentActivities({ api, studentsApi, group, studentId }: { api: ActivitiesApi; studentsApi: StudentsApi; group: Group; studentId: string }) {
  const [cursor, setCursor] = useState<string>();
  const student = useQuery(signal => studentsApi.detail(studentId, signal), studentId), query = useQuery(signal => api.sessions(studentId, signal, cursor), `${studentId}:${cursor ?? ''}`);
  const s = student.result?.kind === 'success' && student.result.data.groupId === group.id ? student.result.data : undefined;
  return <div className="staff-stack"><ActivityLink href={`${groupPath(group.id)}/estudiantes/${encodeURIComponent(studentId)}`}>Volver a la ficha</ActivityLink><ActivityHeading>Tareas digitales</ActivityHeading>
    {!student.result ? <Loading text="Consultando estudiante" /> : !s ? <ActivityFailure result={student.result} /> : <><p>{s.firstName} {s.lastName} · {group.name}</p><ActivityLink href={assignmentPath(group.id)}>Ver asignaciones del curso</ActivityLink>
      {!query.result ? <Loading text="Consultando sesiones" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={query.reload} /> : !query.result.data.items.length ? <Notice title="Sin sesiones en esta página"><p>No hay resultados de desempeño que mostrar. Una ausencia de sesión no equivale a cero.</p></Notice> : <><ActivityTable label="Sesiones del estudiante"><TableHeader><TableRow><TableHead>Preparación</TableHead><TableHead>Intento</TableHead><TableHead>Ejecución y entrega</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader><TableBody>{query.result.data.items.map(v => <TableRow key={v.id}><TableCell>{date(v.preparedAt)}<p>TG-01 · Versión {v.configVersion}</p></TableCell><TableCell className="text-right tabular-nums">{v.attemptNumber ?? 'Sin consumir'}</TableCell><TableCell>{executionLabels[v.executionStatus]}<p>{processingLabels[v.processingStatus]}</p></TableCell><TableCell><a className="staff-link" href={studentTasksPath(group.id, studentId, v.id)} onClick={navigate}>Ver sesión</a></TableCell></TableRow>)}</TableBody></ActivityTable><Next cursor={query.result.data.nextCursor} next={setCursor} /></>}
      <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar sesiones</Button>{cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Primera página</Button>}</div></>}
  </div>;
}
export function SessionResults({ api, group, studentId, sessionId, actorId }: { api: ActivitiesApi; group: Group; studentId: string; sessionId: string; actorId: string }) {
  const query = useQuery(signal => api.session(sessionId, signal), sessionId), mutation = useMutation<{ sessionId: string; runId: string; processingStatus: 'PENDING' }>();
  const s = query.result?.kind === 'success' && query.result.data.studentId === studentId ? query.result.data : undefined;
  async function retry() {
    if (!s?.calculation) return;
    const retryId = operationId(`processing:${actorId}:${sessionId}:${s.calculation.runId}`);
    const result = await mutation.run(signal => api.retry(sessionId, retryId, signal));
    if (result?.kind === 'success') query.reload();
  }
  return <div className="staff-stack"><ActivityLink href={studentTasksPath(group.id, studentId)}>Volver a sesiones</ActivityLink><ActivityHeading>Detalle de sesión</ActivityHeading>
    {!query.result ? <Loading text="Consultando sesión" /> : !s ? <ActivityFailure result={query.result} retry={query.reload} /> : <>
      <section className="staff-stack"><h2 className="staff-section-title">Estado de la actividad</h2><p>{executionLabels[s.executionStatus]}</p><p role="status">{processingLabels[s.processingStatus]}</p><dl className="account-facts"><div><dt>Intento</dt><dd>{s.attemptNumber ?? 'Sin consumir'}</dd></div><div><dt>Inicio autorizado</dt><dd>{date(s.startedAtServer)}</dd></div><div><dt>Recepción confirmada</dt><dd>{date(s.receivedAt)}</dd></div><div><dt>Duración medida</dt><dd>{s.measuredDurationMs === null ? '—' : `${(s.measuredDurationMs / 1000).toFixed(1)} s`}</dd></div><div><dt>Configuración</dt><dd>Versión {s.configVersion} · {s.gameBuildId}</dd></div><div><dt>Ensayos registrados</dt><dd>{s.recordedTrialCount}</dd></div></dl>
        {s.executionStatus === 'INTERRUPTED' && <p>Datos parciales. No se presenta como una ejecución completa ni comparable.</p>}
        <p>Apoyo pedagógico, no diagnóstico. Esta entrega técnica usa datos ficticios; no acredita validación metodológica.</p>
      </section>
      <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar sesión</Button><ActivityLink href={assignmentPath(group.id, s.assignmentId)}>Ver asignación</ActivityLink>{s.attemptNumber !== null && <ActivityLink href={executionPath(`${studentTasksPath(group.id, studentId, sessionId)}/recuperacion`)}>Recuperar envío en este navegador</ActivityLink>}{s.processingStatus === 'FAILED' && <Button disabled={mutation.pending} onClick={() => void retry()}>{mutation.pending ? 'Solicitando cálculo…' : 'Reintentar procesamiento'}</Button>}</div>
      {mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} retry={() => void retry()} />}
      <IndicatorResults session={s} />
      {s.attemptNumber !== null && <RecoveryAccess api={api} sessionId={sessionId} actorId={actorId} hasReceipt={Boolean(s.receipt)} />}
      <section className="staff-stack"><h2 className="staff-section-title">Incidencias y evidencia</h2><p>{s.incidentCount} incidencias registradas. Los fallos técnicos no son errores del estudiante.</p><EvidenceList api={api} sessionId={sessionId} kind="incidents" /><EvidenceList api={api} sessionId={sessionId} kind="trials" /></section>
      <details><summary>Contexto técnico de aplicación</summary><dl className="account-facts"><div><dt>Cierre declarado</dt><dd>{s.terminationReason ?? 'Sin cierre recibido'}</dd></div><div><dt>Configuración histórica</dt><dd className="break-all">{s.configurationHash}</dd></div></dl>{s.device && <dl className="account-facts">{Object.entries(s.device).map(([key, v]) => <div key={key}><dt>{key}</dt><dd>{String(v)}</dd></div>)}</dl>}</details>
    </>}
  </div>;
}
function IndicatorResults({ session }: { session: SessionDetail }) {
  const c = session.calculation;
  return <section className="staff-stack"><h2 className="staff-section-title">Indicadores descriptivos</h2>{!c || c.status !== 'SUCCEEDED' ? <p>No hay indicadores disponibles todavía. {processingLabels[session.processingStatus]}</p> : <>
    <p>Ficha {c.ruleCode} · Versión {c.ruleVersion}. Ensayos observados: {c.summary.observed ?? '—'}; incluidos: {c.summary.included ?? '—'}; excluidos: {c.summary.excluded ?? '—'}.</p>
    <p>Los valores ausentes no se sustituyen por cero. Porcentajes con 2 decimales y tiempos con 1 decimal.</p>
    <ActivityTable label="Indicadores por sesión y segmento"><TableCaption>Resultados por sesión y segmentos</TableCaption><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Ámbito</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Muestra / denominador</TableHead><TableHead>Disponibilidad</TableHead></TableRow></TableHeader><TableBody>{c.indicators.map(i => <TableRow key={`${i.metricCode}:${i.scope}`}><TableCell>{metricLabels[i.metricCode]}</TableCell><TableCell className="whitespace-nowrap">{i.scope === 'SESSION' ? 'Sesión' : `Segmento ${i.scope.slice(-1)}`}</TableCell><TableCell className="text-right tabular-nums whitespace-nowrap">{i.value === null ? '—' : `${i.value.toFixed(i.unit === '%' ? 2 : 1)} ${i.unit}`}</TableCell><TableCell className="text-right tabular-nums whitespace-nowrap">{i.sampleSize} / {i.denominator ?? '—'}</TableCell><TableCell>{i.unavailabilityReason ? unavailableLabels[i.unavailabilityReason] : 'Calculado'}</TableCell></TableRow>)}</TableBody></ActivityTable>
  </>}</section>;
}
function EvidenceList({ api, sessionId, kind }: { api: ActivitiesApi; sessionId: string; kind: 'trials' | 'incidents' }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={e => setOpen(e.currentTarget.open)}><summary>{kind === 'trials' ? 'Ver ensayos y decisiones de cálculo' : 'Ver incidencias'}</summary>{open && <EvidencePage key={`${sessionId}:${kind}`} api={api} sessionId={sessionId} kind={kind} />}</details>;
}
function EvidencePage({ api, sessionId, kind }: { api: ActivitiesApi; sessionId: string; kind: 'trials' | 'incidents' }) {
  const [cursor, setCursor] = useState<string>();
  const query = useQuery(signal => api.evidence(sessionId, kind, signal, cursor), `${sessionId}:${kind}:${cursor ?? ''}`);
  const cell = (v: unknown) => v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const label: Record<string, string> = { star: 'Estrella', moon: 'Luna', hit: 'Acierto', miss: 'Omisión', false_alarm: 'Comisión', correct_rejection: 'Rechazo correcto', not_evaluated: 'No evaluado',
    network_lost: 'Pérdida de conexión', network_restored: 'Conexión restablecida', focus_lost: 'Pérdida de foco', visibility_lost: 'Vista oculta', recovered_after_reload: 'Recuperación tras recarga',
    CONTEXT_ONLY: 'Contexto', MEASUREMENT_AFFECTED: 'Medición afectada', EXECUTION_INTERRUPTED: 'Ejecución interrumpida' };
  const text = (v: unknown) => typeof v === 'string' ? label[v] ?? v : cell(v);
  function decision(v: unknown) {
    if (!object(v)) return 'Todavía sin decisión de cálculo';
    return `${v.included ? 'Incluido en conteo.' : 'Excluido del conteo.'} ${v.rtIncluded ? 'Tiempo de respuesta válido.' : 'Sin tiempo de respuesta incluido.'}${typeof v.reason === 'string' ? ' ' + (unavailableLabels[v.reason] ?? (v.reason === 'NOT_EVALUATED' ? 'No evaluado.' : v.reason)) : ''}`;
  }
  return <div className="staff-stack mt-4">{!query.result ? <Loading text="Consultando evidencia" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={query.reload} /> : !query.result.data.items.length ? <p>Sin evidencia de este tipo en esta página.</p> : <>
    <ActivityTable compactFirst label={kind === 'trials' ? 'Evidencia de ensayos' : 'Evidencia de incidencias'}><TableHeader><TableRow>{(kind === 'trials' ? ['Ensayo', 'Estímulo / resultado declarado', 'Presentación / respuesta / cierre (ms)', 'Decisión de cálculo'] : ['Secuencia', 'Tipo / categoría', 'Inicio / fin (ms)', 'Reloj']).map((t, n) => <TableHead className={n === 0 || n === 2 ? 'text-right' : undefined} key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{query.result.data.items.map((v: Evidence) => <TableRow key={String(v.trial ?? v.sequence)}><TableCell className="text-right tabular-nums">{cell(v.trial ?? v.sequence)}</TableCell><TableCell>{text(v.stimulus ?? v.type)}<p>{text(v.result ?? v.category)}</p>{kind === 'trials' && <details><summary>Contexto del ensayo</summary><dl><dt>Creación (ms)</dt><dd>{cell(v.spawnedAtMs)}</dd><dt>Cierre</dt><dd>{cell(v.closureReason)}</dd><dt>Ventana natural completa</dt><dd>{v.responseWindowCompleted ? 'Sí' : 'No'}</dd><dt>Dispositivo de respuesta</dt><dd>{cell(v.responseDevice)}</dd><dt>Geometría efectiva</dt><dd>{cell(v.geometry)}</dd></dl></details>}</TableCell><TableCell className="text-right tabular-nums">{kind === 'trials' ? `${cell(v.presentedAtMs)} / ${cell(v.respondedAtMs)} / ${cell(v.closedAtMs)}` : `${cell(v.atMs)} / ${cell(v.endedAtMs)}`}</TableCell><TableCell className="max-w-sm break-words">{kind === 'trials' ? decision(v.calculationDecision) : cell(v.clockId)}</TableCell></TableRow>)}</TableBody></ActivityTable><Next cursor={query.result.data.nextCursor} next={setCursor} />{cursor && <Button variant="outline" className="w-fit" onClick={() => setCursor(undefined)}>Primera página</Button>}</>}
  </div>;
}
