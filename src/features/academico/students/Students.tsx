import { useEffect, useRef, useState } from 'react';
import { StudentConsent } from '../consents/StudentConsent';
import { operationHandle } from '../consents/operation-handle.ts';
import type { ConsentsApi } from '../consents/api.ts';
import type { ConsentSnapshot } from '../consents/types.ts';
import type { DraftLease, StudentDraftHost, StudentRefresh } from './student-drafts.ts';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Loading, Notice } from '../../usuarios/shared';
import { useMutation, useQuery } from '../../usuarios/hooks';
import type { HttpResult } from '../../usuarios/types.ts';
import { navigate, replaceCurrentEntry, requestNavigation } from '../../../lib/navigation.ts';
import type { StudentsApi, StudentWrite } from './api.ts';
import { fieldLabels, studentChanges, studentFields, studentIssues } from './types.ts';
import type { Student, StudentField, StudentInput } from './types.ts';
import type { Group } from '../groups/types.ts';
import { CourseBack } from '../groups/Groups';
import { groupPath, groupStudentPath, groupsPath } from '../groups/navigation.ts';
import { assignmentPath } from '../../tareas/activities/types.ts';
import type { ActivitiesApi } from '../../tareas/activities/api.ts';
import { StudentAssignments } from '../../tareas/activities/Activities';
import { StudentIndicatorsLink } from '../../indicadores/StudentIndicatorsLink';
import { StudentObservations } from '../../seguimiento/observations/StudentObservations';
import { StudentNotes } from '../notes/StudentNotes';
import { StudentAnnotations } from '../../seguimiento/annotations/StudentAnnotations';
import type { AnnotationsApi } from '../../seguimiento/annotations/api.ts';
import type { NotesApi } from '../notes/api.ts';
import type { ObservationsApi } from '../../seguimiento/observations/api.ts';
import { observationMatrixPath } from '../../seguimiento/observations/navigation.ts';

export const studentsPath = '/academico/estudiantes';
export const detailPath = (id: string, groupId?: string) => groupId ? groupStudentPath(groupId, id) : `${studentsPath}/${encodeURIComponent(id)}`;
function Link({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} onClick={navigate} className={`${buttonVariants({ variant: primary ? 'default' : 'outline' })} max-w-full [overflow-wrap:anywhere] no-underline`}>{children}</a>;
}
function Back({ id, groupId }: { id?: string; groupId?: string }) {
  return <a className="staff-link w-fit" href={id ? detailPath(id, groupId) : groupId ? groupPath(groupId) : studentsPath} onClick={navigate}><ArrowLeft className="mr-2 size-4" aria-hidden="true" />{id ? 'Volver a la ficha' : groupId ? 'Volver al curso' : 'Volver a estudiantes'}</a>;
}
function Heading({ children }: { children: ReactNode }) {
  return <h1 id="auth-title" className="auth-heading [overflow-wrap:anywhere]" tabIndex={-1}>{children}</h1>;
}
export function Failure({ result, retry }: { result: HttpResult<unknown, StudentField>; retry?: () => void }) {
  const status = result.kind === 'error' ? result.status : undefined;
  const uncertain = 'uncertain' in result && result.uncertain;
  return <Notice focus focusKey={result} title={uncertain ? 'No pudimos confirmar el guardado' : status === 404 ? 'No encontramos el recurso o ya no tienes acceso' : status === 409 ? 'Código de estudiante no disponible' : status === 400 ? 'Revisa los datos del formulario' : 'La consulta no está disponible'}>
    <p>{uncertain ? 'El cambio podría haberse guardado. Consulta el registro antes de volver a guardar; no repetiremos el cambio automáticamente.' : status === 404 ? 'No podemos mostrar este registro con tu acceso actual. Vuelve al listado de estudiantes.' : status === 409 ? 'Utiliza otro código de estudiante.' : status === 400 ? 'Corrige los campos indicados o revisa los datos enviados.' : 'No pudimos cargar la información. Vuelve a intentar la consulta.'}</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>{uncertain ? 'Comprobar estado actual' : 'Reintentar consulta'}</Button>}
  </Notice>;
}
function Facts({ student, group }: { student: Student; group?: Group }) {
  return <dl className="account-facts">
    <div><dt>Código</dt><dd>{student.studentCode}</dd></div><div><dt>Estado</dt><dd><span className="account-status">{student.isActive ? 'Activo' : 'Inactivo'}</span></dd></div>
    <div><dt>Curso</dt><dd>{group?.name ?? 'Nombre del curso no disponible'}</dd></div>
  </dl>;
}

export function Students({ api, group, write, reviewed }: { api: StudentsApi; group?: Group; write?: StudentWrite; reviewed?: () => void }) {
  const query = useQuery((signal) => api.list(signal), group?.id ?? 'students');
  return <div className="staff-stack">
    {group && <CourseBack />}
    <header className="staff-heading"><div className="workspace-page-heading"><Heading>{group?.name ?? 'Estudiantes'}</Heading><p>{group ? `Estudiantes · Grado ${group.grade} · Año ${group.schoolYear}` : 'Consulta y actualiza los registros de tus grupos, incluidos los inactivos.'}</p></div>{group && <Link href={`${groupPath(group.id)}/estudiantes/nuevo`} primary>Registrar estudiante</Link>}</header>
    {group && <div className="staff-actions"><Link href={assignmentPath(group.id)}>Asignaciones de tareas digitales</Link><Link href={observationMatrixPath(group.id)}>Registrar observaciones</Link></div>}
    {!group && <p className="availability-note">Para registrar estudiantes, selecciona primero un curso en <a href={groupsPath} onClick={navigate}>Mis cursos</a>.</p>}
    {!query.result ? <Loading text="Consultando estudiantes" /> : query.result.kind !== 'success' ? <Failure result={query.result} retry={query.reload} /> : !query.result.data.items.length ?
      <Notice title={group ? 'Este curso aún no tiene estudiantes' : 'No hay estudiantes en tus grupos'}><p>{group ? 'Registra el primer estudiante con el botón Registrar estudiante.' : 'Los estudiantes de tus cursos aparecerán aquí.'}</p></Notice> :
      <><p className="text-sm text-muted" role="status">{query.result.data.items.length} {query.result.data.items.length === 1 ? 'estudiante' : 'estudiantes'} {group ? 'en este curso' : 'en tus grupos'}</p><div className="staff-table-region accounts-table-view" role="region" aria-label="Listado de estudiantes, desplazable horizontalmente" tabIndex={0}>
        <Table aria-label="Estudiantes de tus grupos" className="min-w-[38rem]"><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombres</TableHead><TableHead>Apellidos</TableHead><TableHead>Estado</TableHead><TableHead>Ficha</TableHead></TableRow></TableHeader>
          <TableBody>{query.result.data.items.map((student) => <TableRow key={student.id}>
            <TableCell>{student.studentCode}</TableCell><TableCell>{student.firstName}</TableCell><TableCell>{student.lastName}</TableCell><TableCell className="whitespace-nowrap">{student.isActive ? 'Activo' : 'Inactivo'}</TableCell>
            <TableCell><a href={detailPath(student.id, group?.id)} onClick={navigate} className="staff-link whitespace-nowrap" aria-label={`Ver ficha de ${student.firstName} ${student.lastName}, código ${student.studentCode}`}>Ver ficha</a></TableCell>
          </TableRow>)}</TableBody></Table>
      </div><ul className="accounts-list-view" aria-label="Estudiantes de tus grupos">{query.result.data.items.map((student) => <li key={student.id}>
        <h2 className="font-semibold [overflow-wrap:anywhere]">{student.firstName} {student.lastName}</h2>
        <dl className="account-facts"><div><dt>Código</dt><dd>{student.studentCode}</dd></div><div><dt>Estado</dt><dd>{student.isActive ? 'Activo' : 'Inactivo'}</dd></div></dl>
        <a href={detailPath(student.id, group?.id)} onClick={navigate} className="staff-link w-fit" aria-label={`Ver ficha de ${student.firstName} ${student.lastName}, código ${student.studentCode}`}>Ver ficha</a>
      </li>)}</ul></>}
    {group && query.result?.kind === 'success' && write?.phase === 'uncertain' && !write.id && write.groupId === group.id && <Notice title="Revisa el registro que intentaste crear"><p>Comprueba si el estudiante ya aparece en el listado antes de volver a registrar sus datos.</p><Button variant="outline" className="mt-4" onClick={reviewed}>Ya revisé los estudiantes del curso</Button></Notice>}
  </div>;
}

export function StudentRegistration() {
  return <div className="staff-stack max-w-lg"><Back /><Heading>Registrar estudiante</Heading>
    <p>Se creará un registro académico, no una cuenta de acceso. Su estado lo confirma el servidor.</p>
    <Notice title="Selecciona un curso"><p>Abre Mis cursos y selecciona el curso en el que vas a registrar al estudiante.</p></Notice>
    <Link href={groupsPath}>Ir a mis cursos</Link>
  </div>;
}

export function StudentDetail({ api, readApi, activities, consents, observations, notes, annotations, drafts, actorId, apiOrigin, studentId, write, reviewed, group }: {
  api: StudentsApi; readApi: StudentsApi; activities: ActivitiesApi; consents: ConsentsApi; observations: ObservationsApi; notes: NotesApi; annotations: AnnotationsApi; drafts: StudentDraftHost;
  actorId: string; apiOrigin: string; studentId: string; write?: StudentWrite; reviewed(): void; group?: Group;
}) {
  const [student, setStudent] = useState<Student>();
  const [snapshot, setSnapshot] = useState<ConsentSnapshot>();
  const [refresh, setRefresh] = useState<StudentRefresh>({ revision: 0, status: 'checking' });
  const [lease, setLease] = useState<DraftLease>();
  const [failure, setFailure] = useState<HttpResult<unknown, StudentField>>();
  const [queryKey, setQueryKey] = useState(0);
  const sequence = useRef(0), sources = useRef({ readApi, consents }); sources.current = { readApi, consents };
  const query = { fetching: refresh.status === 'checking', reload: () => setQueryKey(value => value + 1) };
  useEffect(() => {
    const request = new AbortController(), count = ++sequence.current, capture = drafts.capture();
    const current = () => {
      const now = drafts.capture();
      return !request.signal.aborted && count === sequence.current && capture.generation === sources.current.consents.generation() && capture.generation === now.generation && capture.epoch === now.epoch;
    };
    setRefresh(old => ({ ...old, status: 'checking' })); setSnapshot(undefined);
    void (async () => {
      const result = await sources.current.consents.snapshot(studentId, request.signal);
      if (!current()) return;
      let academic: HttpResult<Student, StudentField>;
      if (result.kind === 'success') academic = { kind: 'success', data: result.data.student };
      else if (result.kind === 'error' && [401, 403, 404].includes(result.status)) academic = { ...result, fields: undefined };
      else academic = await sources.current.readApi.detail(studentId, request.signal);
      if (!current()) return;
      if (academic.kind === 'success' && (academic.data.id !== studentId || group && academic.data.groupId !== group.id))
        academic = { kind: 'error', status: 404, code: 'NOT_FOUND', uncertain: false };
      if (academic.kind === 'success') {
        if (student && student.groupId !== academic.data.groupId) operationHandle(sessionStorage).clear();
        const nextLease = drafts.confirm({ apiOrigin, actorId, role: 'TEACHER', kind: 'student', studentId,
          groupId: academic.data.groupId, ...(group ? { entryGroupId: group.id } : {}) }, capture.generation, capture.epoch);
        if (!nextLease) return;
        setLease(old => old?.valid() ? old : nextLease); setStudent(academic.data); setFailure(undefined);
        setSnapshot(result.kind === 'success' ? result.data : undefined);
        setRefresh(old => ({ revision: old.revision + 1, status: 'ready' }));
      } else {
        if (academic.kind === 'error' && [401, 403, 404].includes(academic.status)) { drafts.discard(); operationHandle(sessionStorage).clear(); setStudent(undefined); setLease(undefined); }
        setFailure(academic); setRefresh(old => ({ ...old, status: 'unavailable' }));
      }
    })();
    return () => request.abort();
  }, [studentId, group?.id, actorId, apiOrigin, drafts, queryKey]);
  const [notice, setNotice] = useState(() => window.history.state?.studentNotice === 'updated' ? 'Datos actualizados' : window.history.state?.studentNotice === 'created' ? 'Estudiante registrado' : '');
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const state: unknown = window.history.state;
    if (state && typeof state === 'object' && !Array.isArray(state) && Object.hasOwn(state, 'studentNotice')) {
      const { studentNotice: _notice, ...rest } = state as Record<string, unknown>;
      replaceCurrentEntry(window.location.href, rest);
    }
  }, []);
  const focused = useRef(false);
  useEffect(() => { if (student && !focused.current) { focused.current = true; if (!lease?.slot('consent').read()?.focus && !lease?.slot('observations').read()?.focus && !lease?.slot('annotations').read()?.focus) document.getElementById('auth-title')?.focus(); } }, [student, lease]);
  function check() { setChecking(true); query.reload(); }
  const activeSequence = sequence.current;
  const currentSelection = () => activeSequence === sequence.current && Boolean(lease?.valid());
  function recheckSelection() { if (currentSelection()) query.reload(); }
  function lostSelection() {
    if (!currentSelection()) return;
    lease!.discard(); operationHandle(sessionStorage).clear(); setStudent(undefined); setLease(undefined); setSnapshot(undefined);
    setFailure({ kind: 'error', status: 404, code: 'NOT_FOUND', uncertain: false }); setRefresh(old => ({ ...old, status: 'unavailable' }));
  }
  return <div className="staff-stack grid-cols-1 [overflow-wrap:anywhere] [&_.grid>*]:min-w-0"><Back groupId={group?.id} />
    {student ? <>
      <header className="staff-heading"><Heading>{student.firstName} {student.lastName}</Heading><Link href={`${detailPath(student.id, group?.id)}/editar`} primary>Editar estudiante</Link></header>
      <p role="status">{notice}</p><Facts student={student} group={group} />
      {write?.phase === 'uncertain' && write.id === student.id && <Notice title="Hay un guardado sin confirmar">
        <p>Vuelve a consultar el registro y revisa sus datos antes de guardar de nuevo. La consulta muestra el estado actual, pero no confirma quién hizo el cambio. El borrador se retiró al volver a comprobar tu acceso.</p>
        <Button variant="outline" className="mt-4" onClick={check} disabled={query.fetching}>Comprobar estado actual</Button>
        {checking && !query.fetching && <div className="staff-stack mt-4"><p role="status">Estado confirmado por lectura: {student.isActive ? 'activo' : 'inactivo'}. Revisa también el código y los nombres antes de decidir otro guardado.</p><Button variant="outline" onClick={() => { reviewed(); setChecking(false); }}>Ya revisé el registro</Button></div>}
      </Notice>}
      {refresh.status !== 'ready' && <p role="status">{query.fetching ? 'Comprobando el estado actual…' : 'La ficha no está actualizada. Las escrituras esperan una nueva comprobación.'}</p>}
      {lease && <StudentConsent key={`${apiOrigin}:${actorId}:${student.id}:${student.groupId}`} api={consents} studentId={studentId} actorId={actorId} snapshot={snapshot} refresh={refresh} lease={lease} recheck={recheckSelection}
        onChange={change => { if (activeSequence === sequence.current && lease.valid() && change.studentId === studentId) query.reload(); }} />}
      {lease && <StudentObservations key={`observations:${apiOrigin}:${actorId}:${student.id}:${student.groupId}`} api={observations} apiOrigin={apiOrigin} actorId={actorId} student={student} refresh={refresh} consentState={snapshot?.consent.state} draft={lease.slot('observations')} lease={lease} recheck={recheckSelection} onAccessLost={lostSelection} />}
      <StudentAssignments key={student.id} api={activities} student={student} refresh={refresh} />
      <StudentNotes key={`notes:${student.id}`} api={notes} student={student} refresh={refresh} />
      {lease && <StudentAnnotations key={`annotations:${apiOrigin}:${actorId}:${student.id}:${student.groupId}`} api={annotations} student={student} refresh={refresh} draft={lease.slot('annotations')} lease={lease} recheck={recheckSelection} onAccessLost={lostSelection} />}
      <StudentIndicatorsLink student={student} />
      {student.isActive ? <Deactivate api={api} student={student} locked={Boolean(write) || refresh.status !== 'ready'} onSuccess={() => { setNotice('Estudiante inactivado'); query.reload(); }} review={check} /> : <p>Este registro está inactivo. Un nuevo consentimiento confirmado permite reactivarlo.</p>}
    </> : <><Heading>Ficha de estudiante</Heading>{query.fetching || !failure ? <Loading text="Consultando estudiante" /> : <Failure result={failure} retry={query.reload} />}</>}
  </div>;
}

function Deactivate({ api, student, locked, onSuccess, review }: { api: StudentsApi; student: Student; locked: boolean; onSuccess(): void; review(): void }) {
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const mutation = useMutation<Student, StudentField>();
  async function confirm() {
    if (locked || mutation.pending || mutation.result) return;
    const result = await mutation.run((signal) => api.deactivate(student, signal));
    if (result?.kind === 'success') { setOpen(false); onSuccess(); }
    else if (result?.kind === 'error' && result.status === 404) { setOpen(false); review(); }
  }
  return <AlertDialog open={open} onOpenChange={(next) => { if (!mutation.pending) { setOpen(next); if (!next) mutation.clear(); } }}>
    <AlertDialogTrigger id="student-deactivate" disabled={locked} render={<Button variant="outline" className="w-fit" />}>Inactivar estudiante</AlertDialogTrigger>
    <AlertDialogContent initialFocus={cancel} finalFocus={() => document.getElementById('student-deactivate') ?? document.getElementById('auth-title')}>
      <AlertDialogHeader><AlertDialogTitle className="[overflow-wrap:anywhere]">¿Inactivar a {student.firstName} {student.lastName}?</AlertDialogTitle><AlertDialogDescription>El registro pasará a inactivo. Sus datos se conservarán. Esta pantalla no permite reactivarlo.</AlertDialogDescription></AlertDialogHeader>
      {mutation.result && <Failure result={mutation.result} />}
      {mutation.pending && <p role="status">Inactivando estudiante…</p>}
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={mutation.pending}>Cancelar</AlertDialogCancel>
        {mutation.result ? <Button variant="outline" onClick={() => { setOpen(false); mutation.clear(); review(); }}>Cerrar y comprobar estado</Button> : <Button disabled={locked || mutation.pending} onClick={confirm}>{mutation.pending ? 'Inactivando estudiante…' : 'Inactivar estudiante'}</Button>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function StudentEdit({ api, studentId, locked, group }: { api: StudentsApi; studentId: string; locked: boolean; group?: Group }) {
  const query = useQuery((signal) => api.detail(studentId, signal), studentId);
  return <div className="staff-stack max-w-lg"><Back id={studentId} groupId={group?.id} /><Heading>Editar estudiante</Heading>
    {!query.result ? <Loading text="Consultando estudiante" /> : query.result.kind !== 'success' ? <Failure result={query.result} retry={query.reload} /> :
      <EditForm api={api} student={query.result.data} locked={locked} group={group} />}
  </div>;
}
function EditForm({ api, student, locked, group }: { api: StudentsApi; student: Student; locked: boolean; group?: Group }) {
  const [input, setInput] = useState<StudentInput>({ studentCode: student.studentCode, firstName: student.firstName, lastName: student.lastName });
  const [issues, setIssues] = useState<Partial<Record<StudentField, string>>>({});
  const [message, setMessage] = useState('');
  const [observed, setObserved] = useState<Student>();
  const mutation = useMutation<Student, StudentField>();
  const reconciliation = useMutation<Student, StudentField>();
  const summary = useRef<HTMLDivElement>(null);
  const [failedSubmit, setFailedSubmit] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => { if (failedSubmit) summary.current?.focus(); }, [failedSubmit]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || mutation.pending || done || uncertain) return;
    const errors = studentIssues(input);
    setIssues(errors); setMessage('');
    if (Object.keys(errors).length) { setFailedSubmit((value) => value + 1); return; }
    const changes = studentChanges(student, input);
    if (!Object.keys(changes).length) { setMessage('No hay cambios para guardar'); return; }
    const result = await mutation.run((signal) => api.update(student, changes, signal));
    if (result?.kind === 'success') {
      setDone(true);
      void requestNavigation(detailPath(student.id, group?.id), { studentNotice: 'updated' });
    }
    else if (result?.kind === 'error') {
      if (result.status === 409) setIssues({ studentCode: 'Código de estudiante no disponible' });
      else setIssues(Object.fromEntries((result.fields ?? []).map(({ field, reason }) => [field, reason])));
      setFailedSubmit((value) => value + 1);
    }
  }
  async function check() {
    const result = await reconciliation.run((signal) => api.detail(student.id, signal));
    if (result?.kind === 'success') setObserved(result.data);
    else setObserved(undefined);
  }
  const uncertain = mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain;
  const lost = [mutation.result, reconciliation.result].find((result) => result?.kind === 'error' && result.status === 404);
  if (lost) return <Failure result={lost} />;
  return <form className="auth-form" noValidate onSubmit={submit} aria-busy={mutation.pending}>
    <p>Todos los campos son obligatorios. El grupo y el estado no cambiarán al guardar.</p>
    {failedSubmit > 0 && Object.keys(issues).length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="rounded-xl border border-border p-4">
      <h2 className="font-semibold">Revisa los datos del formulario</h2><ul>{Object.entries(issues).map(([field, reason]) => <li key={field}><a className="staff-link" href={`#student-${field}`}>{fieldLabels[field as StudentField]}: {reason}</a></li>)}</ul>
    </div>}
    <StudentFields input={input} setInput={setInput} issues={issues} disabled={mutation.pending || done || locked || Boolean(uncertain)} />
    <p>Curso: {group?.name ?? 'nombre no disponible'}. Estado: {student.isActive ? 'Activo' : 'Inactivo'}. No se modificarán.</p>
    <p className="text-sm">Si otra persona está editando este registro, sus cambios podrían reemplazarse. Revisa los datos antes de guardar.</p>
    <p role="status">{mutation.pending ? 'Guardando estudiante…' : message}</p>
    {mutation.result && mutation.result.kind !== 'success' && <Failure result={mutation.result} retry={uncertain ? check : undefined} />}
    {reconciliation.pending && <Loading text="Comprobando estado" />}
    {reconciliation.result && reconciliation.result.kind !== 'success' && <Failure result={reconciliation.result} />}
    {observed && <Notice title="Estado observado mediante consulta">
      <Facts student={observed} group={group} /><p>{studentFields.every((field) => observed[field] === input[field].trim()) ? 'Los campos consultados coinciden con el formulario. Esto no demuestra quién realizó el cambio.' : 'Los campos consultados difieren del formulario. Revisa las diferencias en la ficha antes de decidir otro guardado.'}</p>
      <p>Nombres: {observed.firstName}. Apellidos: {observed.lastName}.</p><Link href={detailPath(student.id, group?.id)}>Revisar ficha actual</Link>
    </Notice>}
    <div className="staff-actions">{done ? <Link href={detailPath(student.id, group?.id)} primary>Ver ficha actualizada</Link> : <Button type="submit" disabled={mutation.pending || locked || Boolean(uncertain)}>{mutation.pending ? 'Guardando estudiante…' : 'Guardar cambios'}</Button>}<Link href={detailPath(student.id, group?.id)}>Cancelar</Link></div>
  </form>;
}
export function StudentFields({ input, setInput, issues, disabled }: { input: StudentInput; setInput(input: StudentInput): void; issues: Partial<Record<StudentField, string>>; disabled: boolean }) {
  return <>{studentFields.map((field) => <div className="auth-field" key={field}>
      <Label htmlFor={`student-${field}`}>{fieldLabels[field]}</Label>
      <Input id={`student-${field}`} name={field} required autoComplete="off" value={input[field]} disabled={disabled} onChange={(event) => setInput({ ...input, [field]: event.target.value })} aria-invalid={Boolean(issues[field])} aria-describedby={`student-${field}-help${issues[field] ? ` student-${field}-error` : ''}`} />
      <p id={`student-${field}-help`} className="text-sm">{field === 'studentCode' ? 'Entre 1 y 50 caracteres. Conserva los ceros iniciales y las mayúsculas.' : 'Entre 1 y 100 caracteres.'}</p>
      {issues[field] && <p id={`student-${field}-error`} className="auth-field-error">{issues[field]}</p>}
    </div>)}</>;
}

export function StudentWriteNotice({ write }: { write: StudentWrite }) {
  return <Notice title={write.phase === 'pending' ? 'Hay un guardado en curso' : 'No pudimos confirmar el guardado'}>
    <p>{write.phase === 'pending' ? 'Espera a que termine. Cerrar o cambiar la página no demuestra que se haya cancelado.' : 'No repitas la operación sin comprobar el registro. Una respuesta perdida no demuestra que el cambio se haya deshecho.'}</p>
    {write.phase === 'uncertain' && write.id && <Link href={detailPath(write.id, write.groupId)}>Ir a comprobar el registro</Link>}
    {write.phase === 'uncertain' && !write.id && write.groupId && <Link href={groupPath(write.groupId)}>Revisar estudiantes del curso</Link>}
  </Notice>;
}
