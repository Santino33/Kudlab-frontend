import { useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '../usuarios/hooks';
import { Loading, Notice } from '../usuarios/shared';
import type { TasksApi } from './api.ts';
import type { TaskSummary } from './types.ts';
import { reasonLabels } from './types.ts';
import { navigate } from '../../lib/navigation.ts';
import { TaskAvailability, useAvailability } from './Availability';

function Preparation({ task }: { task: TaskSummary }) {
  return <div className="grid gap-3"><span className="task-state">{task.assignable ? 'Lista para asignar' : 'No lista para asignar'}</span>
    <ul className="task-reasons">{task.unavailableReasons.map((reason) => <li key={reason}>{reasonLabels[reason]}</li>)}</ul></div>;
}
function TaskFailure({ missing, retry }: { missing: boolean; retry(): void }) {
  return <Notice title={missing ? 'No encontramos esta tarea' : 'No pudimos consultar las tareas'}>
    <p>{missing ? 'El enlace no corresponde a una tarea del catálogo actual. Vuelve al catálogo para consultar las tareas disponibles.' : 'No pudimos cargar el catálogo. Vuelve a intentarlo para consultar las tareas.'}</p>
    {!missing && <Button variant="outline" className="mt-4" onClick={retry}>Reintentar</Button>}
  </Notice>;
}
export function Catalog({ api, admin = false }: { api: TasksApi; admin?: boolean }) {
  const query = useQuery((signal) => api.list(signal), 'tasks', true);
  const availability = useAvailability(api, query.reload);
  const page = query.result?.kind === 'success' ? query.result.data : undefined;
  return <div className="staff-stack">
    <header className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Tareas digitales</h1>
      <p>{admin ? 'Gestiona qué tareas pueden asignar los profesores y consulta su preparación.' : 'Explora la finalidad pedagógica de cada juego y consulta su disponibilidad.'}</p></header>
    <p className="availability-note">Para asignar una actividad disponible, abre el curso en Mis cursos. La disponibilidad requiere configuración compatible y autorización de participación.</p>
    {!query.result && <Loading text="Consultando tareas" />}
    {query.result && query.result.kind !== 'success' && <TaskFailure missing={false} retry={query.reload} />}
    {page && (page.items.length === 0 ? <Notice title="Todavía no hay juegos registrados"><p>Los juegos registrados aparecerán aquí cuando estén disponibles para consulta.</p></Notice> :
      <><div className="staff-table-region accounts-table-view" role="region" aria-label="Catálogo de juegos; desplazamiento horizontal disponible" tabIndex={0}>
        <Table><TableCaption className="px-4 pt-4">Juegos registrados en el alcance actual</TableCaption><TableHeader><TableRow>
          <TableHead>Nombre y código</TableHead><TableHead>Disponibilidad</TableHead><TableHead>Preparación</TableHead><TableHead>Ficha</TableHead>
        </TableRow></TableHeader><TableBody>{page.items.map((task) => <TableRow key={task.id}>
          <TableCell><p className="font-semibold">{task.title}</p><p className="text-sm mt-1">{task.id}</p></TableCell>
          <TableCell><TaskAvailability task={task} admin={admin} control={availability} fetching={query.fetching} /></TableCell>
          <TableCell><Preparation task={task} /></TableCell>
          <TableCell><a className="staff-link whitespace-nowrap" onClick={navigate} href={`/tareas/${encodeURIComponent(task.id)}`} aria-label={`Ver ficha de ${task.title} (${task.id})`}>Ver ficha<ArrowRight className="ml-2 size-5 shrink-0" aria-hidden="true" /></a></TableCell>
        </TableRow>)}</TableBody></Table>
      </div><ul className="accounts-list-view" aria-label="Catálogo de juegos">{page.items.map((task) => <li key={task.id} className="grid-cols-[minmax(0,1fr)] [overflow-wrap:anywhere]">
        <h2 className="font-semibold">{task.title}</h2><p className="text-sm">{task.id}</p>
        <TaskAvailability task={task} admin={admin} control={availability} fetching={query.fetching} />
        <Preparation task={task} /><a className="staff-link w-fit" onClick={navigate} href={`/tareas/${encodeURIComponent(task.id)}`} aria-label={`Ver ficha de ${task.title} (${task.id})`}>Ver ficha<ArrowRight className="ml-2 size-5" aria-hidden="true" /></a>
      </li>)}</ul></>)}
  </div>;
}

export function TaskDetail({ api, taskId, admin = false }: { api: TasksApi; taskId: string; admin?: boolean }) {
  const query = useQuery((signal) => api.detail(taskId, signal), taskId, true);
  const availability = useAvailability(api, query.reload);
  const task = query.result?.kind === 'success' ? query.result.data : undefined;
  useEffect(() => { document.getElementById('auth-title')?.focus(); }, [task?.id]);
  return <div className="staff-stack">
    <a href="/tareas" onClick={navigate} className="staff-back-link"><ArrowLeft className="size-5 shrink-0" aria-hidden="true" />Volver a tareas</a>
    <div className="staff-panel"><div className="p-4 sm:p-6"><div className="staff-stack staff-detail-content">
    <header className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>{task ? `${task.title} · ${task.id}` : 'Ficha de tarea'}</h1>
      {task && <p>{task.description}</p>}</header>
    {!query.result && <Loading text="Consultando ficha" />}
    {query.result && query.result.kind !== 'success' && <TaskFailure missing={query.result.kind === 'error' && [400, 404].includes(query.result.status)} retry={query.reload} />}
    {task && <>
      <section className="grid gap-3" aria-labelledby="task-purpose"><h2 id="task-purpose" className="staff-section-title">Finalidad pedagógica</h2><p>{task.purpose}</p></section>
      <section className="grid gap-4" aria-labelledby="task-status"><h2 id="task-status" className="staff-section-title">Estado actual</h2>
        <TaskAvailability task={task} admin={admin} control={availability} fetching={query.fetching} />
        <dl><dt>Compatibilidad de configuración</dt><dd>{task.integrationReady ? 'Compatible con el juego disponible' : 'Pendiente de preparación'}</dd></dl>
        <Preparation task={task} />
      </section>
      <section className="grid gap-3" aria-labelledby="task-version"><h2 id="task-version" className="staff-section-title">Configuración publicada</h2>
        <p>{task.publishedVersion ? `Versión ${task.publishedVersion.version}` : 'Sin versión publicada'}</p></section>
      <Notice title="Apoyo pedagógico, no diagnóstico"><p>{task.pedagogicalNotice}</p></Notice>
    </>}
    </div></div></div>
  </div>;
}
