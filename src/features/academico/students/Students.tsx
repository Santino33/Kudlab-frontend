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
import { navigateTasks as navigate } from '../../tareas/navigation.ts';
import type { StudentsApi, StudentWrite } from './api.ts';
import { fieldLabels, studentChanges, studentFields, studentIssues } from './types.ts';
import type { Student, StudentField, StudentInput } from './types.ts';

export const studentsPath = '/academico/estudiantes';
const detailPath = (id: string) => `${studentsPath}/${encodeURIComponent(id)}`;
function Link({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} onClick={navigate} className={`${buttonVariants({ variant: primary ? 'default' : 'outline' })} max-w-full [overflow-wrap:anywhere] no-underline`}>{children}</a>;
}
function Back({ id }: { id?: string }) {
  return <a className="staff-link w-fit" href={id ? detailPath(id) : studentsPath} onClick={navigate}><ArrowLeft className="mr-2 size-4" aria-hidden="true" />{id ? 'Volver a la ficha' : 'Volver a estudiantes'}</a>;
}
function Heading({ children }: { children: ReactNode }) {
  return <h1 id="auth-title" className="auth-heading [overflow-wrap:anywhere]" tabIndex={-1}>{children}</h1>;
}
function Failure({ result, retry }: { result: HttpResult<unknown, StudentField>; retry?: () => void }) {
  const status = result.kind === 'error' ? result.status : undefined;
  const uncertain = 'uncertain' in result && result.uncertain;
  return <Notice focus focusKey={result} title={uncertain ? 'No pudimos confirmar el guardado' : status === 404 ? 'No encontramos el recurso o ya no tienes acceso' : status === 409 ? 'Código de estudiante no disponible' : status === 400 ? 'Revisa los datos del formulario' : 'La consulta no está disponible'}>
    <p>{uncertain ? 'El cambio podría haberse guardado. Comprueba el estado antes de decidir otra escritura; no se repetirá automáticamente.' : status === 404 ? 'No podemos mostrar datos de este recurso desde tu acceso actual.' : status === 409 ? 'Utiliza otro código. No se revela a quién pertenece el código ocupado.' : status === 400 ? 'Corrige los campos indicados o revisa los datos enviados.' : 'No pudimos obtener una respuesta válida. Puedes volver a consultar manualmente.'}</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>{uncertain ? 'Comprobar estado actual' : 'Reintentar consulta'}</Button>}
  </Notice>;
}
function Facts({ student }: { student: Student }) {
  return <dl className="account-facts">
    <div><dt>Código</dt><dd>{student.studentCode}</dd></div><div><dt>Estado</dt><dd><span className="account-status">{student.isActive ? 'Activo' : 'Inactivo'}</span></dd></div>
    <div><dt>Grupo</dt><dd>Nombre del grupo no disponible</dd></div>
  </dl>;
}

export function Students({ api }: { api: StudentsApi }) {
  const query = useQuery((signal) => api.list(signal), 'students');
  return <div className="staff-stack">
    <header className="staff-heading"><div className="workspace-page-heading"><Heading>Estudiantes</Heading><p>Registros de los grupos bajo tu responsabilidad</p></div><Link href={`${studentsPath}/nuevo`} primary>Registrar estudiante</Link></header>
    <p>Los nombres de los grupos todavía no están disponibles. La lista incluye registros activos e inactivos.</p>
    {!query.result ? <Loading text="Consultando estudiantes" /> : query.result.kind !== 'success' ? <Failure result={query.result} retry={query.reload} /> : !query.result.data.items.length ?
      <Notice title="No hay estudiantes en tus grupos" /> :
      <div className="overflow-x-auto rounded-xl border border-border" role="region" aria-label="Listado de estudiantes, desplazable horizontalmente" tabIndex={0}>
        <Table aria-label="Estudiantes de tus grupos" className="min-w-[38rem]"><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombres</TableHead><TableHead>Apellidos</TableHead><TableHead>Estado</TableHead><TableHead>Ficha</TableHead></TableRow></TableHeader>
          <TableBody>{query.result.data.items.map((student) => <TableRow key={student.id}>
            <TableCell>{student.studentCode}</TableCell><TableCell>{student.firstName}</TableCell><TableCell>{student.lastName}</TableCell><TableCell className="whitespace-nowrap">{student.isActive ? 'Activo' : 'Inactivo'}</TableCell>
            <TableCell><a href={detailPath(student.id)} onClick={navigate} className="staff-link whitespace-nowrap" aria-label={`Ver ficha de ${student.firstName} ${student.lastName}, código ${student.studentCode}`}>Ver ficha</a></TableCell>
          </TableRow>)}</TableBody></Table>
      </div>}
  </div>;
}

export function StudentRegistration() {
  return <div className="staff-stack max-w-lg"><Back /><Heading>Registrar estudiante</Heading>
    <p>Se creará un registro académico inactivo. No se creará una cuenta de acceso.</p>
    <Notice title="Registro no disponible"><p>El registro requiere una consulta de grupos autorizados que todavía no está disponible.</p></Notice>
    <Link href={studentsPath}>Volver a estudiantes</Link>
  </div>;
}

export function StudentDetail({ api, studentId, write, reviewed }: { api: StudentsApi; studentId: string; write?: StudentWrite; reviewed(): void }) {
  const query = useQuery((signal) => api.detail(studentId, signal), studentId);
  const student = !query.fetching && query.result?.kind === 'success' ? query.result.data : undefined;
  const [notice, setNotice] = useState(() => window.history.state?.studentNotice === 'updated' ? 'Datos actualizados' : '');
  const [checking, setChecking] = useState(false);
  useEffect(() => { if (window.history.state?.studentNotice) window.history.replaceState(null, ''); }, []);
  useEffect(() => { if (student) document.getElementById('auth-title')?.focus(); }, [student]);
  function check() { setChecking(true); query.reload(); }
  return <div className="staff-stack"><Back />
    {student ? <>
      <header className="staff-heading"><Heading>{student.firstName} {student.lastName}</Heading><Link href={`${detailPath(student.id)}/editar`} primary>Editar estudiante</Link></header>
      <p role="status">{notice}</p><Facts student={student} />
      {write?.phase === 'uncertain' && write.id === student.id && <Notice title="Hay un guardado sin confirmar">
        <p>Comprueba el registro con una nueva lectura. El estado observado no demuestra quién realizó el cambio. Los borradores se retiran cuando se vuelve a comprobar el acceso.</p>
        <Button variant="outline" className="mt-4" onClick={check} disabled={query.fetching}>Comprobar estado actual</Button>
        {checking && !query.fetching && <div className="staff-stack mt-4"><p role="status">Estado confirmado por lectura: {student.isActive ? 'activo' : 'inactivo'}. Revisa también el código y los nombres antes de decidir otro guardado.</p><Button variant="outline" onClick={() => { reviewed(); setChecking(false); }}>He revisado el estado; permitir una nueva decisión</Button></div>}
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

export function StudentEdit({ api, studentId, locked }: { api: StudentsApi; studentId: string; locked: boolean }) {
  const query = useQuery((signal) => api.detail(studentId, signal), studentId);
  return <div className="staff-stack max-w-lg"><Back id={studentId} /><Heading>Editar estudiante</Heading>
    {!query.result ? <Loading text="Consultando estudiante" /> : query.result.kind !== 'success' ? <Failure result={query.result} retry={query.reload} /> :
      <EditForm api={api} student={query.result.data} locked={locked} />}
  </div>;
}
function EditForm({ api, student, locked }: { api: StudentsApi; student: Student; locked: boolean }) {
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
      window.history.pushState({ studentNotice: 'updated' }, '', detailPath(student.id));
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
    <p>Todos los campos son obligatorios. Solo se cambiarán los datos modificados.</p>
    {failedSubmit > 0 && Object.keys(issues).length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="rounded-xl border border-border p-4">
      <h2 className="font-semibold">Revisa los datos del formulario</h2><ul>{Object.entries(issues).map(([field, reason]) => <li key={field}><a className="staff-link" href={`#student-${field}`}>{fieldLabels[field as StudentField]}: {reason}</a></li>)}</ul>
    </div>}
    {studentFields.map((field) => <div className="auth-field" key={field}>
      <Label htmlFor={`student-${field}`}>{fieldLabels[field]}</Label>
      <Input id={`student-${field}`} name={field} required autoComplete="off" value={input[field]} disabled={mutation.pending || done || locked || Boolean(uncertain)} onChange={(event) => setInput({ ...input, [field]: event.target.value })} aria-invalid={Boolean(issues[field])} aria-describedby={`student-${field}-help${issues[field] ? ` student-${field}-error` : ''}`} />
      <p id={`student-${field}-help`} className="text-sm">{field === 'studentCode' ? 'Entre 1 y 50 caracteres. Conserva los ceros iniciales y las mayúsculas.' : 'Entre 1 y 100 caracteres.'}</p>
      {issues[field] && <p id={`student-${field}-error`} className="auth-field-error">{issues[field]}</p>}
    </div>)}
    <p>Grupo: nombre no disponible. Estado: {student.isActive ? 'Activo' : 'Inactivo'}. No se modificarán.</p>
    <p className="text-sm">No se detectan ediciones simultáneas de otras personas. Revisa los datos antes de guardar.</p>
    <p role="status">{mutation.pending ? 'Guardando estudiante…' : message}</p>
    {mutation.result && mutation.result.kind !== 'success' && <Failure result={mutation.result} retry={uncertain ? check : undefined} />}
    {reconciliation.pending && <Loading text="Comprobando estado" />}
    {reconciliation.result && reconciliation.result.kind !== 'success' && <Failure result={reconciliation.result} />}
    {observed && <Notice title="Estado observado mediante consulta">
      <Facts student={observed} /><p>{studentFields.every((field) => observed[field] === input[field].trim()) ? 'Los campos consultados coinciden con el formulario. Esto no demuestra quién realizó el cambio.' : 'Los campos consultados difieren del formulario. Revisa las diferencias en la ficha antes de decidir otro guardado.'}</p>
      <p>Nombres: {observed.firstName}. Apellidos: {observed.lastName}.</p><Link href={detailPath(student.id)}>Revisar ficha actual</Link>
    </Notice>}
    <div className="staff-actions">{done ? <Link href={detailPath(student.id)} primary>Ver ficha actualizada</Link> : <Button type="submit" disabled={mutation.pending || locked || Boolean(uncertain)}>{mutation.pending ? 'Guardando estudiante…' : 'Guardar cambios'}</Button>}<Link href={detailPath(student.id)}>Cancelar</Link></div>
  </form>;
}

export function StudentWriteNotice({ write }: { write: StudentWrite }) {
  return <Notice title={write.phase === 'pending' ? 'Hay un guardado en curso' : 'No pudimos confirmar el guardado'}>
    <p>{write.phase === 'pending' ? 'Espera a que termine. Cerrar o cambiar la página no demuestra que se haya cancelado.' : 'No repitas la operación sin comprobar el registro. Una respuesta perdida no demuestra que el cambio se haya deshecho.'}</p>
    {write.phase === 'uncertain' && write.id && <Link href={detailPath(write.id)}>Ir a comprobar el registro</Link>}
  </Notice>;
}
