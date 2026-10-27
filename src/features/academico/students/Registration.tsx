import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useMutation } from '../../usuarios/hooks';
import type { StudentsApi } from './api.ts';
import type { Group } from '../groups/types.ts';
import type { Student, StudentField, StudentInput } from './types.ts';
import { fieldLabels, studentIssues } from './types.ts';
import { detailPath, Failure, StudentFields } from './Students';
import { CourseLink } from '../groups/Groups';
import { groupPath } from '../groups/navigation.ts';

export function Registration({ api, group, locked }: { api: StudentsApi; group: Group; locked: boolean }) {
  const [input, setInput] = useState<StudentInput>({ studentCode: '', firstName: '', lastName: '' });
  const [issues, setIssues] = useState<Partial<Record<StudentField, string>>>({});
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const mutation = useMutation<Student, StudentField>();
  useEffect(() => { if (failed) summary.current?.focus(); }, [failed]);
  const uncertain = Boolean(mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || mutation.pending || done || uncertain) return;
    const errors = studentIssues(input); setIssues(errors);
    if (Object.keys(errors).length) { setFailed(n => n + 1); return; }
    const result = await mutation.run(signal => api.create({ ...input, groupId: group.id }, signal));
    if (result?.kind === 'success') {
      setDone(true);
      window.history.pushState({ studentNotice: 'created' }, '', detailPath(result.data.id, group.id));
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (result?.kind === 'error') {
      setIssues(result.status === 409 ? { studentCode: 'Código de estudiante no disponible' } : Object.fromEntries((result.fields ?? []).map(field => [field.field, field.reason])));
      setFailed(n => n + 1);
    }
  }
  return <div className="staff-stack max-w-lg"><CourseLink href={groupPath(group.id)}>Volver al curso</CourseLink><header className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Registrar estudiante</h1><p>Curso: {group.name} · Grado {group.grade} · Año {group.schoolYear}</p></header>
    <p>El estudiante se registrará como inactivo en este curso. No se creará una cuenta de acceso. Todos los campos son obligatorios.</p>
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={mutation.pending}>
      {failed > 0 && Object.keys(issues).length > 0 && <div role="alert" ref={summary} tabIndex={-1}><h2 className="font-semibold">Revisa los datos del estudiante</h2><ul>{Object.entries(issues).map(([field, reason]) => <li key={field}><a className="staff-link" href={`#student-${field}`}>{fieldLabels[field as StudentField]}: {reason}</a></li>)}</ul></div>}
      <StudentFields input={input} setInput={setInput} issues={issues} disabled={locked || mutation.pending || done || uncertain} />
      {mutation.result && mutation.result.kind !== 'success' && <Failure result={mutation.result} />}
      <div className="staff-actions"><Button type="submit" disabled={locked || mutation.pending || done || uncertain}>{mutation.pending ? 'Registrando estudiante…' : 'Registrar estudiante'}</Button><CourseLink href={groupPath(group.id)}>Cancelar</CourseLink></div>
    </form>
  </div>;
}
