import { useRef, useState, type FormEvent, type ReactNode } from 'react';
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
import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { assignmentPath, studentTasksPath, executionPath, executionLabels, processingLabels, metricLabels, unavailableLabels, type Assignment, type AssignmentSummary, type SessionDetail } from './types.ts';
import { AssignmentAccess, RecoveryAccess } from './AccessCodes';
import { newPreparation, preparationKey, readPreparation, savePreparation } from './code-preparation';
import { MentalistaResults } from './MentalistaResults';

export function ActivityLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} onClick={navigate} className={cn(buttonVariants({ variant: primary ? 'default' : 'outline' }), 'w-fit max-w-full whitespace-normal text-left [overflow-wrap:anywhere]')}>{children}</a>;
}
export function ActivityFailure({ result, retry }: { result?: HttpResult<unknown, string>; retry?(): void }) {
  if (result?.kind === 'error' && result.status === 403 && result.code === 'PARTICIPATION_BLOCKED') return <Notice focus focusKey={result} title="Participación no habilitada">
    <p>Uno o más estudiantes no están habilitados para esta operación. Revisa su estado en el curso. Tu sesión sigue disponible; no es una pérdida de acceso del profesor.</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>Consultar estado actual</Button>}
  </Notice>;
  return <Notice title={result?.kind === 'error' && result.status === 404 ? 'No encontramos el recurso o ya no tienes acceso' : 'No pudimos confirmar la operación'}>
    <p>{result?.kind === 'error' && result.status === 409 ? 'El estado actual no permite esta operación. Actualiza la asignación para revisar disponibilidad, participación e intentos.' : result?.kind === 'error' && result.status === 400 ? 'Revisa los datos y la configuración. No se ha confirmado la operación.' : 'Una respuesta perdida no demuestra que el cambio se haya deshecho. Conservamos la misma solicitud al reintentar.'}</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>Reintentar la misma solicitud</Button>}
  </Notice>;
}
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
function AssignmentDate({ value }: { value: string }) {
  return <time dateTime={value}><span>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))}</span>{' '}<span className="assignment-time">{new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' }).format(new Date(value))}</span></time>;
}
export function ActivityHeading({ children }: { children: ReactNode }) { return <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{children}</h1>; }
export function ActivityTable({ children, label, compactFirst = false }: { children: ReactNode; label: string; compactFirst?: boolean }) {
  return <><p className="text-sm sm:hidden">Puedes desplazar la tabla horizontalmente para consultar todas sus columnas.</p><div className={cn('staff-table-region', compactFirst && 'activity-evidence')} role="region" aria-label={label} tabIndex={0}><Table>{children}</Table></div></>;
}
const availabilityLabel = (a: AssignmentSummary) => a.status === 'CANCELLED' ? 'Cancelada' : a.availability === 'CURRENT' ? 'Vigente' : a.availability === 'FUTURE' ? 'Próxima' : 'Vencida';
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
      <ActivityTable label="Asignaciones del curso"><TableCaption>Fechas en {Intl.DateTimeFormat().resolvedOptions().timeZone}</TableCaption><TableHeader><TableRow><TableHead>Actividad</TableHead><TableHead>Disponibilidad</TableHead><TableHead className="text-right">Destinatarios</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader><TableBody>{query.result.data.items.map(a => <TableRow key={a.id}><TableCell>{a.title}<p className="text-sm">Versión {a.configVersion}</p></TableCell><TableCell>{date(a.startsAt)} – {date(a.endsAt)}<p>{availabilityLabel(a)}</p></TableCell><TableCell className="text-right tabular-nums">{a.recipientCount}</TableCell><TableCell><a className="staff-link" href={assignmentPath(group.id, a.id)} onClick={navigate}>Ver asignación</a></TableCell></TableRow>)}</TableBody></ActivityTable>
      <Next cursor={query.result.data.nextCursor} next={setCursor} />
    </>}
    <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar asignaciones</Button>{cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Primera página</Button>}</div>
  </div>;
}
function AssignmentForm({ api, studentsApi, tasksApi, group, actorId }: { api: ActivitiesApi; studentsApi: StudentsApi; tasksApi: TasksApi; group: Group; actorId: string }) {
  const [taskId, setTaskId] = useState<'TG-01' | 'TG-03'>(() => { try { return JSON.parse(sessionStorage.getItem(`kudlab:j02:assignment:${actorId}:${group.id}`) ?? 'null')?.taskId === 'TG-03' ? 'TG-03' : 'TG-01'; } catch { return 'TG-01'; } });
  const catalog = useQuery(signal => tasksApi.list(signal), 'assignment-catalog');
  const studentQuery = useQuery(signal => studentsApi.list(signal), group.id), taskQuery = useQuery(signal => tasksApi.detail(taskId, signal), taskId);
  const [selected, setSelected] = useState<string[]>([]), [error, setError] = useState('');
  const key = `kudlab:j02:assignment:${actorId}:${group.id}`;
  const [frozen, setFrozen] = useState<AssignmentInput | undefined>(() => { try { const v = JSON.parse(sessionStorage.getItem(key) ?? 'null'); return v?.groupId === group.id && typeof v.requestId === 'string' ? v : undefined; } catch { return; } });
  const mutation = useMutation<Assignment>();
  const [created, setCreated] = useState<Assignment>();
  const submitting = useRef(false);
  const task = taskQuery.result?.kind === 'success' ? taskQuery.result.data : undefined;
  const students = studentQuery.result?.kind === 'success' ? studentQuery.result.data.items : undefined;
  const selectedIds = selected.filter(id => students?.some(s => s.id === id && s.isActive));
  async function send(input: AssignmentInput, verify = false) {
    const result = created ? { kind: 'success' as const, data: created } : await mutation.run(async signal => {
      if (verify) {
        const latest = await tasksApi.detail(input.taskId, signal);
        if (latest.kind !== 'success') return latest;
        if (!latest.data.assignable || latest.data.publishedVersion?.id !== input.publishedVersionId) return { kind: 'error' as const, status: 409, code: 'CONFLICT' as const, uncertain: false };
      }
      return api.create(input, signal);
    });
    if (result?.kind === 'success') {
      setCreated(result.data);
      try {
        const preparation = preparationKey(actorId, result.data.id);
        const op = readPreparation(sessionStorage, preparation, result.data) ?? newPreparation(result.data.recipients.map(r => r.id), true);
        savePreparation(sessionStorage, preparation, op);
        sessionStorage.removeItem(key);
      } catch { setError('La asignación ya está creada. No pudimos conservar el progreso de sus códigos; habilita el almacenamiento y vuelve a continuar.'); return; }
      go(assignmentPath(group.id, result.data.id));
    } else if (result?.kind === 'error' && ([400, 409].includes(result.status) || result.status === 403 && result.code === 'PARTICIPATION_BLOCKED')) {
      sessionStorage.removeItem(key); submitting.current = false; setFrozen(undefined);
      if (result.code === 'PARTICIPATION_BLOCKED') studentQuery.reload();
      if (result.status === 409) taskQuery.reload();
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current || mutation.pending || frozen || !task?.publishedVersion) return;
    const values = new FormData(event.currentTarget), start = new Date(String(values.get('startsAt'))), end = new Date(String(values.get('endsAt'))), maxAttempts = Number(values.get('maxAttempts'));
    if (!selectedIds.length || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) { setError('Selecciona estudiantes activos, un periodo válido y entre 1 y 10 intentos.'); return; }
    if (task.id !== taskId) return;
    const input: AssignmentInput = { requestId: crypto.randomUUID(), taskId, publishedVersionId: task.publishedVersion.id, groupId: group.id, studentIds: selectedIds, startsAt: start.toISOString(), endsAt: end.toISOString(), maxAttempts };
    submitting.current = true;
    try { sessionStorage.setItem(key, JSON.stringify(input)); } catch { submitting.current = false; setError('No podemos conservar la solicitud para reconciliarla. Habilita el almacenamiento de este sitio antes de guardar.'); return; }
    setError(''); setFrozen(input); void send(input, true);
  }
  return <section className="staff-stack activity-form" aria-labelledby="assignment-form-title"><h2 id="assignment-form-title" className="staff-section-title">Asignar {taskId === 'TG-03' ? 'Mentalista' : 'Lluvia de estrellas'}</h2>
    <div className="auth-field"><Label htmlFor="assignment-task">Tarea digital</Label><select id="assignment-task" className="staff-select" value={taskId} disabled={Boolean(frozen) || mutation.pending} onChange={e => { if (e.target.value === 'TG-01' || e.target.value === 'TG-03') { setTaskId(e.target.value); setSelected([]); setError(''); } }}>
      {catalog.result?.kind === 'success' ? catalog.result.data.items.filter(t => t.id === 'TG-01' || t.id === 'TG-03').map(t => <option key={t.id} value={t.id}>{t.id} · {t.title}</option>) : <option value="TG-01">TG-01 · Lluvia de estrellas</option>}
    </select>{catalog.result && catalog.result.kind !== 'success' && <ActivityFailure result={catalog.result} retry={catalog.reload} />}</div>
    <p>Los destinatarios quedan fijados al guardar. El límite de intentos lo decide el profesor; no es un umbral científico.</p>
    {frozen ? <Notice title={created ? 'Asignación creada' : mutation.pending ? 'Creando asignación…' : 'Hay una creación por confirmar'}><p>{frozen.studentIds.length} destinatarios · {date(frozen.startsAt)} – {date(frozen.endsAt)} · {frozen.maxAttempts} intentos. Conservamos la misma solicitud, sin duplicar la asignación.</p><Button className="mt-4" disabled={mutation.pending} onClick={() => void send(frozen)}>{mutation.pending ? 'Creando asignación…' : created ? 'Continuar con los códigos' : 'Comprobar creación'}</Button></Notice> : !task || !students ? (!studentQuery.result || !taskQuery.result ? <Loading text="Preparando formulario" /> : <ActivityFailure retry={() => { studentQuery.reload(); taskQuery.reload(); }} />) : <form onSubmit={submit} className="auth-form">
      <p>{task.pedagogicalNotice}</p>{!task.assignable && <Notice title="Actividad no disponible"><ul>{task.unavailableReasons.map(r => <li key={r}>{r === 'METHODOLOGY_PENDING' ? 'Método pendiente de aprobación' : r === 'TASK_DISABLED' ? 'Tarea deshabilitada' : 'Configuración o integración pendiente'}</li>)}</ul></Notice>}
      <fieldset className="staff-stack" disabled={mutation.pending || !task.assignable}><legend className="font-semibold mb-3">Estudiantes destinatarios</legend>
        <Button type="button" variant="outline" className="w-fit" disabled={!students.some(s => s.isActive)} onClick={() => setSelected(students.filter(s => s.isActive).map(s => s.id))}>Seleccionar todos los actuales</Button>
        {students.map(s => <label key={s.id} className="activity-choice"><input type="checkbox" disabled={!s.isActive} checked={selectedIds.includes(s.id)} onChange={e => setSelected(old => e.target.checked ? [...old, s.id] : old.filter(id => id !== s.id))} /><span>{s.firstName} {s.lastName} · {s.studentCode}{!s.isActive && ' · Inactivo: no puede recibir tareas'}</span></label>)}
        {!students.length && <p>Este curso no tiene estudiantes.</p>}
        {!!students.length && !students.some(s => s.isActive) && <p>No hay estudiantes activos para asignar esta actividad.</p>}
        <p>{selectedIds.length} destinatarios seleccionados. Incorporar estudiantes al curso después no cambiará esta lista. El servidor vuelve a comprobar la participación al guardar.</p>
        <div className="auth-field"><Label htmlFor="assignment-start">Disponible desde</Label><Input id="assignment-start" name="startsAt" type="datetime-local" required /></div>
        <div className="auth-field"><Label htmlFor="assignment-end">Disponible hasta</Label><Input id="assignment-end" name="endsAt" type="datetime-local" required /></div>
        <p>Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}. El servidor comprobará la vigencia.</p>
        <div className="auth-field"><Label htmlFor="assignment-attempts">Máximo de intentos</Label><Input id="assignment-attempts" name="maxAttempts" type="number" min={1} max={10} step={1} required aria-describedby="assignment-attempts-help" /><p id="assignment-attempts-help">Entre 1 y 10. Abrir instrucciones no consume; comenzar con confirmación del servidor sí.</p></div>
      </fieldset><p>Al guardar se preparan los códigos de los estudiantes seleccionados. Podrás mostrarlos en clase.</p><Button disabled={!task.assignable || !selectedIds.length || mutation.pending} type="submit">Guardar asignación y códigos</Button>
    </form>}
    {error && <p role="alert">{error}</p>}{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}
  </section>;
}
export function AssignmentDetail({ api, group, assignmentId, actorId }: { api: ActivitiesApi; group: Group; assignmentId: string; actorId: string }) {
  const query = useQuery(signal => api.assignment(assignmentId, signal), assignmentId);
  const a = query.result?.kind === 'success' && query.result.data.groupId === group.id ? query.result.data : undefined;
  const mutation = useMutation<Assignment>(), [requestId] = useState(() => operationId(`cancel:${actorId}:${assignmentId}`));
  async function cancel() { const result = await mutation.run(signal => api.cancel(assignmentId, requestId, signal)); if (result?.kind === 'success') query.reload(); }
  return <div className="staff-stack assignment-detail"><ActivityLink href={assignmentPath(group.id)}>Volver a asignaciones</ActivityLink>
    {!a && <ActivityHeading>Asignación</ActivityHeading>}
    {!query.result ? <Loading text="Consultando asignación" /> : !a ? <ActivityFailure result={query.result} retry={query.reload} /> : <>
      <header className="assignment-heading"><ActivityHeading>{a.title}</ActivityHeading><p>{group.name} · {a.availability === 'CURRENT' ? 'Disponible ahora' : a.availability === 'FUTURE' ? 'Programada' : a.availability === 'CANCELLED' ? 'Cancelada' : 'Finalizada'}</p></header>
      <section aria-label="Información de la asignación" className="assignment-summary"><dl>
        <div><dt>Disponible desde</dt><dd><AssignmentDate value={a.startsAt} /></dd></div><div><dt>Disponible hasta</dt><dd><AssignmentDate value={a.endsAt} /></dd></div>
        <div><dt>Máximo de intentos</dt><dd>{a.maxAttempts} por estudiante</dd></div><div><dt>Estudiantes asignados</dt><dd>{a.recipientCount}</dd></div>
      </dl><p>Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p></section>
      <AssignmentAccess key={a.id} api={api} assignment={a} groupId={group.id} actorId={actorId} reloadAssignment={query.reload} />
      <details className="assignment-management"><summary>Detalles técnicos y gestión</summary><div className="staff-stack mt-4"><p>Versión {a.configVersion} · Las condiciones y los destinatarios quedan fijados al guardar.</p>
      {a.status === 'OPEN' && <AlertDialog><AlertDialogTrigger render={<Button variant="outline" className="w-fit" />}>Cancelar nuevos inicios</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar nuevos inicios?</AlertDialogTitle><AlertDialogDescription>Se conservarán las sesiones, la evidencia y los destinatarios. No se podrán comenzar nuevas actividades de esta asignación.</AlertDialogDescription></AlertDialogHeader>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button onClick={() => void cancel()} disabled={mutation.pending}>{mutation.pending ? 'Cancelando…' : 'Cancelar nuevos inicios'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      </div></details>
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
      {!query.result ? <Loading text="Consultando sesiones" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={query.reload} /> : !query.result.data.items.length ? <Notice title="Sin sesiones en esta página"><p>No hay resultados de desempeño que mostrar. Una ausencia de sesión no equivale a cero.</p></Notice> : <><ActivityTable label="Sesiones del estudiante"><TableHeader><TableRow><TableHead>Preparación</TableHead><TableHead>Intento</TableHead><TableHead>Ejecución y entrega</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader><TableBody>{query.result.data.items.map(v => <TableRow key={v.id}><TableCell>{date(v.preparedAt)}<p>{v.taskId} · Versión {v.configVersion}</p></TableCell><TableCell className="text-right tabular-nums">{v.attemptNumber ?? 'Sin consumir'}</TableCell><TableCell>{executionLabels[v.executionStatus]}<p>{processingLabels[v.processingStatus]}</p></TableCell><TableCell><a className="staff-link" href={studentTasksPath(group.id, studentId, v.id)} onClick={navigate}>Ver sesión</a></TableCell></TableRow>)}</TableBody></ActivityTable><Next cursor={query.result.data.nextCursor} next={setCursor} /></>}
      <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar sesiones</Button>{cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Primera página</Button>}</div></>}
  </div>;
}
/** Ficha del estudiante: asignaciones en las que es destinatario fijo (individuales o colectivas). */
export function StudentAssignments({ api, student, refresh }: { api: ActivitiesApi; student: { id: string; groupId: string }; refresh?: { revision: number; status: 'ready' | 'checking' | 'unavailable' } }) {
  const [cursor, setCursor] = useState<string>();
  const query = useQuery(signal => api.studentAssignments(student.id, signal, cursor), `${student.id}:${cursor ?? ''}:${refresh?.revision ?? 0}`, true);
  return <section className="staff-stack" aria-labelledby="student-assignments-title"><h2 id="student-assignments-title" className="staff-section-title">Asignaciones</h2>
    <p>Actividades asignadas a este estudiante, solo o junto con otros. Las más recientes aparecen primero.</p>
    {refresh && refresh.status !== 'ready' && <p role="status">Comprobación académica pendiente. Una asignación no autoriza por sí sola un nuevo inicio.</p>}
    {!query.result ? <Loading text="Consultando asignaciones del estudiante" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={query.reload} /> : !query.result.data.items.length ?
      <Notice title={cursor ? 'Página sin registros' : 'Sin asignaciones'}><p>{cursor ? 'No hay más asignaciones en esta página. Vuelve a la primera página.' : 'Este estudiante todavía no tiene asignaciones.'}</p></Notice> : <>
      <ActivityTable label="Asignaciones del estudiante"><TableCaption>Fechas en {Intl.DateTimeFormat().resolvedOptions().timeZone}</TableCaption><TableHeader><TableRow><TableHead>Actividad</TableHead><TableHead>Asignada el</TableHead><TableHead>Disponibilidad</TableHead><TableHead className="text-right">Intentos usados</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader>
        <TableBody>{query.result.data.items.map(a => <TableRow key={a.id}><TableCell>{a.title}<p className="text-sm">{a.recipientCount === 1 ? 'Solo este estudiante' : `Junto con ${a.recipientCount - 1} ${a.recipientCount === 2 ? 'estudiante más' : 'estudiantes más'}`}</p></TableCell><TableCell>{date(a.createdAt)}</TableCell><TableCell>{date(a.startsAt)} – {date(a.endsAt)}<p>{availabilityLabel(a)}</p></TableCell><TableCell className="text-right tabular-nums whitespace-nowrap">{a.attemptsStarted} de {a.maxAttempts}</TableCell><TableCell><a className="staff-link" href={assignmentPath(a.groupId, a.id)} onClick={navigate}>Ver asignación</a></TableCell></TableRow>)}</TableBody></ActivityTable>
      <Next cursor={query.result.data.nextCursor} next={setCursor} />
    </>}
    <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar asignaciones</Button>{cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Primera página</Button>}<ActivityLink href={studentTasksPath(student.groupId, student.id)}>Ver sesiones del estudiante</ActivityLink></div>
  </section>;
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
      <section className="staff-stack" aria-labelledby="session-summary-title"><h2 id="session-summary-title" className="staff-section-title">Resumen de la sesión</h2><dl className="account-facts"><div><dt>Estado de la actividad</dt><dd>{executionLabels[s.executionStatus]}</dd></div><div><dt>Estado de los resultados</dt><dd role="status">{processingLabels[s.processingStatus]}</dd></div><div><dt>Intento</dt><dd>{s.attemptNumber ?? 'Sin consumir'}</dd></div><div><dt>Inicio autorizado</dt><dd>{date(s.startedAtServer)}</dd></div><div><dt>Recepción confirmada</dt><dd>{date(s.receivedAt)}</dd></div><div><dt>Duración medida</dt><dd>{s.measuredDurationMs === null ? '—' : `${(s.measuredDurationMs / 1000).toFixed(1)} s`}</dd></div><div><dt>Ensayos registrados</dt><dd>{s.recordedTrialCount}</dd></div></dl>
        {s.executionStatus === 'INTERRUPTED' && <p>Datos parciales. No se presenta como una ejecución completa ni comparable.</p>}
        <p>Apoyo pedagógico, no diagnóstico. Esta entrega técnica usa datos ficticios; no acredita validación metodológica.</p>
      </section>
      <div className="staff-actions"><Button variant="outline" onClick={query.reload}>Actualizar sesión</Button><ActivityLink href={assignmentPath(group.id, s.assignmentId)}>Ver asignación</ActivityLink>{s.attemptNumber !== null && <ActivityLink href={executionPath(`${studentTasksPath(group.id, studentId, sessionId)}/recuperacion`)}>Recuperar envío en este navegador</ActivityLink>}{s.processingStatus === 'FAILED' && <Button disabled={mutation.pending} onClick={() => void retry()}>{mutation.pending ? 'Solicitando cálculo…' : 'Reintentar procesamiento'}</Button>}</div>
      {mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} retry={() => void retry()} />}
      {s.taskId === 'TG-03' ? <MentalistaResults session={s} api={api} /> : <IndicatorResults session={s} />}
      {s.attemptNumber !== null && !s.receipt && <details><summary>Resolver un envío pendiente</summary><RecoveryAccess api={api} sessionId={sessionId} actorId={actorId} taskTitle={s.taskId === 'TG-03' ? 'Mentalista' : 'Lluvia de estrellas'} /></details>}
    </>}
  </div>;
}
function IndicatorResults({ session }: { session: Extract<SessionDetail, { taskId: 'TG-01' }> }) {
  const c = session.calculation;
  return <section className="staff-stack" aria-labelledby="session-results-title"><h2 id="session-results-title" className="staff-section-title">Resultados por sesión y partes</h2>{!c || c.status !== 'SUCCEEDED' ? <p>No hay indicadores disponibles todavía. {processingLabels[session.processingStatus]}</p> : <>
    <p>Ensayos observados: {c.summary.observed ?? '—'}; incluidos: {c.summary.included ?? '—'}; excluidos: {c.summary.excluded ?? '—'}.</p>
    <p>Si un resultado falta, se muestra «—» con el motivo; no se cambia por cero. Usa el símbolo de ayuda de cada columna para saber qué significa.</p>
    <ActivityTable label="Indicadores por sesión y segmento"><TableCaption>Resultados de toda la actividad y de cada parte</TableCaption><TableHeader><TableRow>{indicatorColumns.map(c => <TableHead key={c.label} scope="col" className={c.numeric ? 'text-right' : undefined}><ColumnHelp label={c.label} help={c.help} /></TableHead>)}</TableRow></TableHeader><TableBody>{c.indicators.map(i => <TableRow key={`${i.metricCode}:${i.scope}`}><TableCell>{metricLabels[i.metricCode]}</TableCell><TableCell className="whitespace-nowrap">{i.scope === 'SESSION' ? 'Toda la actividad' : `Parte ${i.scope.slice(-1)}`}</TableCell><TableCell className="text-right tabular-nums whitespace-nowrap">{i.value === null ? '—' : `${i.value.toFixed(i.unit === '%' ? 2 : 1)} ${i.unit}`}</TableCell><TableCell className="text-right tabular-nums whitespace-nowrap">{i.sampleSize} / {i.denominator ?? '—'}</TableCell><TableCell>{i.unavailabilityReason ? unavailableLabels[i.unavailabilityReason] : 'Calculado'}</TableCell></TableRow>)}</TableBody></ActivityTable>
  </>}</section>;
}
const indicatorColumns = [
  { label: 'Indicador', help: 'Qué se está midiendo, por ejemplo, aciertos o tiempo de respuesta.' },
  { label: 'Parte de la actividad', help: 'Indica si el resultado es de toda la actividad o de una de sus partes.' },
  { label: 'Resultado', help: 'Resultado obtenido. % significa porcentaje; ms, milésimas de segundo.', numeric: true },
  { label: 'Datos usados / total', help: 'Primero: datos usados. Después: total para calcular el porcentaje. «—» significa que no aplica.', numeric: true },
  { label: 'Estado del resultado', help: 'Dice si se pudo calcular el resultado o por qué falta.' },
];
/** Column help (shadcn Popover): hover, keyboard (Enter/Space) and touch; Escape or outside click closes it, focus is not trapped. */
function ColumnHelp({ label, help }: { label: string; help: string }) {
  return <span className="column-heading">{label}<Popover><PopoverTrigger openOnHover delay={200} closeDelay={150} className="column-help" aria-label={`Qué significa «${label}»`}><CircleHelp aria-hidden="true" className="size-5" /></PopoverTrigger><PopoverContent side="top">{help}</PopoverContent></Popover></span>;
}
