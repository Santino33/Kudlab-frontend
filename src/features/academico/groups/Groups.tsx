import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useMutation, useQuery } from '../../usuarios/hooks';
import { Loading, Notice } from '../../usuarios/shared';
import type { HttpResult } from '../../usuarios/types.ts';
import { navigate } from '../../../lib/navigation.ts';
import type { GroupsApi, GroupWrite } from './api.ts';
import { groupFields, groupIssues, groupLabels } from './types.ts';
import type { Group, GroupField } from './types.ts';
import { go, groupPath, groupsPath } from './navigation.ts';

export function CourseLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} onClick={navigate} className={`${buttonVariants({ variant: primary ? 'default' : 'outline' })} no-underline`}>{children}</a>;
}
export function CourseBack() { return <a href={groupsPath} onClick={navigate} className="staff-link w-fit"><ArrowLeft className="mr-2 size-5" aria-hidden="true" />Volver a mis cursos</a>; }
export function GroupFailure({ result, retry }: { result: HttpResult<unknown, string>; retry?: () => void }) {
  const status = result.kind === 'error' ? result.status : undefined;
  const uncertain = 'uncertain' in result && result.uncertain;
  return <Notice title={uncertain ? 'Hay una operación del curso sin confirmar' : status === 404 ? 'Curso no disponible' : status === 409 ? 'No se pudo completar la operación del curso' : 'No pudimos completar la consulta'} focus focusKey={result}>
    <p>{uncertain ? 'El cambio podría haberse aplicado. Consulta los cursos antes de decidir si necesitas enviarlo de nuevo.' : status === 404 ? 'El curso no existe o ya no tienes acceso. Vuelve a mis cursos para consultar tu listado actual.' : status === 409 ? 'El curso puede contener estudiantes, el profesor ya no es elegible o cambió su responsabilidad. Consulta el estado actual antes de volver a intentarlo.' : status === 400 ? 'Revisa los datos indicados en el formulario.' : 'Vuelve a intentarlo para obtener información actualizada.'}</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>Consultar estado actual</Button>}
  </Notice>;
}
export function GroupWriteNotice({ write }: { write: GroupWrite }) {
  return <Notice title={write.phase === 'pending' ? 'Guardando cambios del curso' : 'Hay una operación del curso sin confirmar'}>
    <p>{write.phase === 'pending' ? 'Espera a que termine. Salir de la pantalla no cancela un cambio que ya llegó al servidor.' : 'No repitas la operación sin revisar el listado de cursos. Una respuesta perdida no demuestra que el cambio se haya deshecho.'}</p>
    {write.phase === 'uncertain' && <div className="mt-4"><CourseLink href={groupsPath}>Revisar cursos</CourseLink></div>}
  </Notice>;
}
export function Groups({ api, admin, write, reviewed }: { api: GroupsApi; admin: boolean; write?: GroupWrite; reviewed(): void }) {
  const query = useQuery(signal => api.list(signal), 'groups');
  return <div className="staff-stack">
    <header className="staff-heading"><div className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Mis cursos</h1><p>{admin ? 'Organiza los cursos y asigna a cada uno su profesor responsable.' : 'Selecciona un curso para consultar y gestionar a sus estudiantes.'}</p></div>
      {admin && <CourseLink href={`${groupsPath}/nuevo`} primary><Plus aria-hidden="true" />Crear curso</CourseLink>}</header>
    {!query.result ? <Loading text="Consultando cursos" /> : query.result.kind !== 'success' ? <GroupFailure result={query.result} retry={query.reload} /> : <>
      {write?.phase === 'uncertain' && <Notice title="Revisa los cursos antes de volver a guardar"><p>El listado acaba de consultarse. Si creaste un curso, verifica si ya aparece; si editaste o eliminaste uno, abre su ficha para comprobar el resultado.</p><Button variant="outline" className="mt-4" onClick={reviewed}>Ya revisé los cursos</Button></Notice>}
      {!query.result.data.items.length ? <Notice title={admin ? 'Todavía no hay cursos' : 'Aún no tienes cursos asignados'}><p>{admin ? 'Crea un curso y selecciona su profesor responsable para empezar.' : 'Cuando el administrador te asigne un curso, aparecerá aquí.'}</p></Notice> :
        <ul className="courses-grid" aria-label="Cursos disponibles">{query.result.data.items.map(group => <li key={group.id}><Card className="course-card">
          <div className="course-cover"><h2>{group.name}</h2></div>
          <CardContent><p className="font-medium">Grado {group.grade} <span aria-hidden="true">·</span> Año {group.schoolYear}</p><div><p className="text-sm text-muted">Profesor responsable</p><p className="mt-1 font-medium [overflow-wrap:anywhere]">{group.teacherName}</p></div></CardContent>
          <CardFooter><CourseLink href={groupPath(group.id)}>Abrir curso<ArrowRight aria-hidden="true" /></CourseLink>{admin && <a className="staff-link" href={`${groupPath(group.id)}/editar`} onClick={navigate}>Editar curso</a>}</CardFooter>
        </Card></li>)}</ul>}
    </>}
  </div>;
}
export function GroupContent({ api, groupId, children }: { api: GroupsApi; groupId: string; children(group: Group): ReactNode }) {
  const query = useQuery(signal => api.detail(groupId, signal), groupId);
  return query.result?.kind === 'success' ? children(query.result.data) : <div className="staff-stack"><CourseBack /><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Curso</h1>{!query.result ? <Loading text="Consultando curso" /> : <GroupFailure result={query.result} retry={query.reload} />}</div>;
}
export function GroupAdministration({ group, api, locked }: { group: Group; api: GroupsApi; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const mutation = useMutation<{ id: string; deleted: true }, GroupField>();
  async function remove() {
    if (locked || mutation.pending || mutation.result) return;
    const result = await mutation.run(signal => api.delete(group.id, signal));
    if (result?.kind === 'success') go(groupsPath);
  }
  return <div className="staff-stack"><CourseBack /><header className="staff-heading"><div className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>{group.name}</h1><p>Grado {group.grade} · Año {group.schoolYear}</p></div><CourseLink href={`${groupPath(group.id)}/editar`} primary>Editar curso</CourseLink></header>
    <dl className="account-facts"><div><dt>Profesor responsable</dt><dd>{group.teacherName}</dd></div></dl>
    <p>Los estudiantes de este curso son gestionados por su profesor responsable. El acceso administrativo no permite consultar sus registros.</p>
    <section className="staff-stack"><h2 className="staff-section-title">Eliminar curso</h2><p>Solo se pueden eliminar cursos sin estudiantes. Los registros inactivos también impiden la eliminación.</p><Button id="group-delete" variant="outline" className="w-fit" disabled={locked} onClick={() => setOpen(true)}>Eliminar curso</Button></section>
    <AlertDialog open={open} onOpenChange={value => { if (!mutation.pending) { setOpen(value); if (!value) mutation.clear(); } }}><AlertDialogContent initialFocus={cancel} finalFocus={() => document.getElementById('group-delete') ?? document.getElementById('auth-title')}>
      <AlertDialogHeader><AlertDialogTitle>¿Eliminar el curso {group.name}?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Si el curso contiene estudiantes, no se eliminará.</AlertDialogDescription></AlertDialogHeader>
      {mutation.result && <GroupFailure result={mutation.result} />}
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={mutation.pending}>Cancelar</AlertDialogCancel>{mutation.result ? <Button variant="outline" onClick={() => { setOpen(false); go(groupsPath); }}>Cerrar y revisar cursos</Button> : <Button disabled={locked || mutation.pending} onClick={remove}>{mutation.pending ? 'Eliminando curso…' : 'Eliminar curso'}</Button>}</AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>;
}
export function GroupForm({ api, before, locked }: { api: GroupsApi; before?: Group; locked: boolean }) {
  const teachers = useQuery(signal => api.teachers(signal), 'teachers');
  const [input, setInput] = useState({ name: before?.name ?? '', grade: before?.grade ?? '', schoolYear: before ? String(before.schoolYear) : '', teacherId: before?.teacherId ?? '' });
  const [issues, setIssues] = useState<Partial<Record<GroupField, string>>>({});
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(0);
  const summary = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const mutation = useMutation<Group, GroupField>();
  useEffect(() => { if (failed) summary.current?.focus(); }, [failed]);
  useEffect(() => { document.getElementById('auth-title')?.focus(); }, []);
  const value = { ...input, schoolYear: input.schoolYear.trim() ? Number(input.schoolYear) : NaN };
  const transfer = Boolean(before && before.teacherId !== input.teacherId);
  async function save(confirmed = false) {
    if (locked || mutation.pending || mutation.result?.kind === 'success' || !teachers.result || teachers.result.kind !== 'success') return;
    const invalid = groupIssues(value); setIssues(invalid); setMessage('');
    if (Object.keys(invalid).length) { setFailed(n => n + 1); return; }
    if (before && groupFields.every(field => value[field] === before[field])) { setMessage('No hay cambios para guardar'); return; }
    if (transfer && !confirmed) { setOpen(true); return; }
    const result = await mutation.run(signal => api.save(value, signal, before, confirmed));
    if (result?.kind === 'success') { setOpen(false); go(groupPath(result.data.id)); }
    else if (result?.kind === 'error') { setOpen(false); setIssues(Object.fromEntries((result.fields ?? []).map(field => [field.field, field.reason]))); setFailed(n => n + 1); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save(); }
  const disabled = locked || mutation.pending || mutation.result?.kind === 'success';
  const available = teachers.result?.kind === 'success' ? teachers.result.data.items : [];
  return <div className="staff-stack max-w-lg"><CourseBack /><h1 id="auth-title" className="auth-heading" tabIndex={-1}>{before ? 'Editar curso' : 'Crear curso'}</h1>
    <p>{before ? 'Actualiza los datos del curso o cambia su profesor responsable.' : 'Asigna un profesor para que pueda registrar y gestionar a sus estudiantes.'}</p>
    {!teachers.result ? <Loading text="Consultando profesores" /> : teachers.result.kind !== 'success' ? <GroupFailure result={teachers.result} retry={teachers.reload} /> : <form className="auth-form" noValidate onSubmit={submit} aria-busy={mutation.pending}>
      {failed > 0 && Object.keys(issues).length > 0 && <div ref={summary} role="alert" tabIndex={-1}><h2 className="font-semibold">Revisa los datos del curso</h2><ul>{groupFields.filter(field => issues[field]).map(field => <li key={field}><a className="staff-link" href={`#group-${field}`}>{groupLabels[field]}: {issues[field]}</a></li>)}</ul></div>}
      {(['name', 'grade', 'schoolYear'] as const).map(field => <div className="auth-field" key={field}><Label htmlFor={`group-${field}`}>{groupLabels[field]}</Label><Input id={`group-${field}`} name={field} inputMode={field === 'schoolYear' ? 'numeric' : undefined} autoComplete="off" required disabled={disabled} value={input[field]} onChange={event => setInput({ ...input, [field]: event.target.value })} aria-invalid={Boolean(issues[field])} aria-describedby={`group-${field}-help`} /><p id={`group-${field}-help`} className="text-sm">{issues[field] ?? (field === 'name' ? 'Entre 1 y 50 caracteres.' : field === 'grade' ? 'Entre 1 y 20 caracteres.' : 'Escribe el año escolar como número entero.')}</p></div>)}
      <div className="auth-field"><Label htmlFor="group-teacherId">Profesor responsable</Label><select id="group-teacherId" className="staff-select" required disabled={disabled} value={input.teacherId} onChange={event => setInput({ ...input, teacherId: event.target.value })} aria-invalid={Boolean(issues.teacherId)} aria-describedby="group-teacher-help"><option value="">Selecciona un profesor</option>{before && !available.some(teacher => teacher.id === before.teacherId) && <option value={before.teacherId}>{before.teacherName} (responsable actual)</option>}{available.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><p id="group-teacher-help" className="text-sm">{issues.teacherId ?? 'Solo se pueden asignar profesores con cuenta docente habilitada.'}</p></div>
      {!available.length && <Notice title="No hay profesores elegibles para una nueva asignación"><p>Habilita una cuenta docente antes de asignarla a un curso. Puedes conservar el responsable actual al editar.</p></Notice>}
      {before && <p className="text-sm">Si otra persona está editando este curso, sus cambios podrían reemplazarse. Revisa los datos antes de guardar.</p>}
      {mutation.result && mutation.result.kind !== 'success' && <GroupFailure result={mutation.result} />}
      <p role="status">{message}</p><div className="staff-actions"><Button type="submit" disabled={disabled}>{mutation.pending ? 'Guardando curso…' : before ? 'Guardar cambios' : 'Crear curso'}</Button><CourseLink href={before ? groupPath(before.id) : groupsPath}>Cancelar</CourseLink></div>
    </form>}
    <AlertDialog open={open} onOpenChange={next => { if (!mutation.pending) setOpen(next); }}><AlertDialogContent initialFocus={cancel}>
      <AlertDialogHeader><AlertDialogTitle>¿Cambiar el profesor responsable?</AlertDialogTitle><AlertDialogDescription>El profesor anterior perderá acceso a los estudiantes de este curso y el nuevo podrá gestionarlos. Los registros se conservarán.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={mutation.pending}>Cancelar</AlertDialogCancel><Button disabled={disabled} onClick={() => void save(true)}>{mutation.pending ? 'Guardando curso…' : 'Confirmar cambio de profesor'}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>;
}
