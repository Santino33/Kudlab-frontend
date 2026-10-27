import { useEffect, useRef, useState } from 'react';
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
import { navigate } from '../../../lib/navigation.ts';
import type { StudentsApi, StudentWrite } from './api.ts';
import { fieldLabels, studentChanges, studentFields, studentIssues } from './types.ts';
import type { Student, StudentField, StudentInput } from './types.ts';
import type { Group } from '../groups/types.ts';
import { CourseBack } from '../groups/Groups';
import { groupPath, groupStudentPath, groupsPath } from '../groups/navigation.ts';

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
    <p>Se creará un registro académico inactivo. No se creará una cuenta de acceso.</p>
    <Notice title="Selecciona un curso"><p>Abre Mis cursos y selecciona el curso en el que vas a registrar al estudiante.</p></Notice>
    <Link href={groupsPath}>Ir a mis cursos</Link>
  </div>;
}

export function StudentDetail({ api, studentId, write, reviewed, group }: { api: StudentsApi; studentId: string; write?: StudentWrite; reviewed(): void; group?: Group }) {
  const query = useQuery((signal) => api.detail(studentId, signal), studentId);
  const student = !query.fetching && query.result?.kind === 'success' ? query.result.data : undefined;
  const [notice, setNotice] = useState(() => window.history.state?.studentNotice === 'updated' ? 'Datos actualizados' : window.history.state?.studentNotice === 'created' ? 'Estudiante registrado' : '');
  const [checking, setChecking] = useState(false);
  useEffect(() => { if (window.history.state?.studentNotice) window.history.replaceState(null, ''); }, []);
  useEffect(() => { if (student) document.getElementById('auth-title')?.focus(); }, [student]);
  function check() { setChecking(true); query.reload(); }
  return <div className="staff-stack"><Back groupId={group?.id} />
    {student ? <>
      <header className="staff-heading"><Heading>{student.firstName} {student.lastName}</Heading><Link href={`${detailPath(student.id, group?.id)}/editar`} primary>Editar estudiante</Link></header>
      <p role="status">{notice}</p><Facts student={student} group={group} />
      {write?.phase === 'uncertain' && write.id === student.id && <Notice title="Hay un guardado sin confirmar">
        <p>Vuelve a consultar el registro y revisa sus datos antes de guardar de nuevo. La consulta muestra el estado actual, pero no confirma quién hizo el cambio. El borrador se retiró al volver a comprobar tu acceso.</p>
        <Button variant="outline" className="mt-4" onClick={check} disabled={query.fetching}>Comprobar estado actual</Button>
        {checking && !query.fetching && <div className="staff-stack mt-4"><p role="status">Estado confirmado por lectura: {student.isActive ? 'activo' : 'inactivo'}. Revisa también el código y los nombres antes de decidir otro guardado.</p><Button variant="outline" onClick={() => { reviewed(); setChecking(false); }}>Ya revisé el registro</Button></div>}
      </Notice>}
      {student.isActive ? <Deactivate api={api} student={student} locked={Boolean(write)} onSuccess={() => { setNotice('Estudiante inactivado'); query.reload(); }} review={check} /> : <p>Este registro está inactivo. La edición sigue permitida; esta pantalla no permite reactivarlo.</p>}
    </> : <><Heading>Ficha de estudiante</Heading>{query.fetching || !query.result ? <Loading text="Consultando estudiante" /> : <Failure result={query.result} retry={query.reload} />}</>}
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
      window.history.pushState({ studentNotice: 'updated' }, '', detailPath(student.id, group?.id));
      window.dispatchEvent(new PopStateEvent('popstate'));
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
