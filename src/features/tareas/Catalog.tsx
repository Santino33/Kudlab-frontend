import { useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '../usuarios/hooks';
import { Loading, Notice } from '../usuarios/shared';
import type { TasksApi } from './api.ts';
import type { TaskSummary } from './types.ts';
import { reasonLabels } from './types.ts';
import { navigateTasks } from './navigation.ts';

function Preparation({ task }: { task: TaskSummary }) {
  return <div className="grid gap-3"><span className="task-state">{task.assignable ? 'Lista para asignar' : 'No lista para asignar'}</span>
    <ul className="task-reasons">{task.unavailableReasons.map((reason) => <li key={reason}>{reasonLabels[reason]}</li>)}</ul></div>;
}
function TaskFailure({ missing, retry }: { missing: boolean; retry(): void }) {
  return <Notice title={missing ? 'No encontramos esta tarea' : 'No pudimos consultar las tareas'}>
    <p>{missing ? 'El enlace no corresponde a una tarea del catálogo actual.' : 'La información no pudo comprobarse. No se mostrará una lista vacía como si fuera un resultado.'}</p>
    {!missing && <Button variant="outline" className="mt-4" onClick={retry}>Reintentar</Button>}
  </Notice>;
}
export function Catalog({ api }: { api: TasksApi }) {
  const query = useQuery((signal) => api.list(signal), 'tasks');
  const page = query.result?.kind === 'success' ? query.result.data : undefined;
  return <div className="staff-stack">
    <header className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Tareas digitales</h1>
      <p>Consulta los juegos del alcance actual, su finalidad y su preparación. Una ficha metodológica no significa que el juego esté integrado.</p></header>
    <p className="task-context">El segundo juego está por definir. La familiarización (TG-00) y el cierre (TG-06) son apoyos, no juegos asignables independientes.</p>
    {!query.result && <Loading text="Consultando tareas" />}
    {query.result && query.result.kind !== 'success' && <TaskFailure missing={false} retry={query.reload} />}
    {page && (page.items.length === 0 ? <Notice title="Todavía no hay juegos registrados"><p>Los juegos registrados aparecerán aquí cuando estén disponibles para consulta.</p></Notice> :
      <div className="staff-table-region" role="region" aria-label="Catálogo de juegos; desplazamiento horizontal disponible" tabIndex={0}>
        <Table><TableCaption className="px-4 pt-4">Juegos registrados en el alcance actual</TableCaption><TableHeader><TableRow>
          <TableHead>Nombre y código</TableHead><TableHead>Disponibilidad</TableHead><TableHead>Preparación</TableHead><TableHead>Ficha</TableHead>
        </TableRow></TableHeader><TableBody>{page.items.map((task) => <TableRow key={task.id}>
          <TableCell><p className="font-semibold">{task.title}</p><p className="text-sm mt-1">{task.id}</p></TableCell>
          <TableCell><span className="task-state">{task.isEnabled ? 'Habilitada' : 'Deshabilitada'}</span><p className="text-sm mt-3">Estado administrativo</p></TableCell>
          <TableCell><Preparation task={task} /></TableCell>
          <TableCell><a className="staff-link whitespace-nowrap" onClick={navigateTasks} href={`/tareas/${encodeURIComponent(task.id)}`} aria-label={`Ver ficha de ${task.title} (${task.id})`}>Ver ficha<ArrowRight className="ml-2 size-5 shrink-0" aria-hidden="true" /></a></TableCell>
        </TableRow>)}</TableBody></Table>
      </div>)}
  </div>;
}

export function TaskDetail({ api, taskId }: { api: TasksApi; taskId: string }) {
  const query = useQuery((signal) => api.detail(taskId, signal), taskId);
  const task = query.result?.kind === 'success' ? query.result.data : undefined;
  useEffect(() => { document.getElementById('auth-title')?.focus(); }, [task?.id]);
  return <div className="staff-stack task-detail">
    <a href="/tareas" onClick={navigateTasks} className="staff-link w-fit"><ArrowLeft className="mr-2 size-5" aria-hidden="true" />Volver a tareas</a>
    <header className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>{task ? `${task.title} · ${task.id}` : 'Ficha de tarea'}</h1>
      {task && <p>{task.description}</p>}</header>
    {!query.result && <Loading text="Consultando ficha" />}
    {query.result && query.result.kind !== 'success' && <TaskFailure missing={query.result.kind === 'error' && [400, 404].includes(query.result.status)} retry={query.reload} />}
    {task && <>
      <section className="grid gap-3" aria-labelledby="task-purpose"><h2 id="task-purpose" className="staff-section-title">Finalidad pedagógica</h2><p>{task.purpose}</p></section>
      <section className="grid gap-4" aria-labelledby="task-status"><h2 id="task-status" className="staff-section-title">Estado actual</h2>
        <dl className="grid gap-4"><div><dt>Disponibilidad administrativa</dt><dd>{task.isEnabled ? 'Habilitada' : 'Deshabilitada'}</dd></div>
          <div><dt>Integración comprobada</dt><dd>{task.integrationReady ? 'Comprobada' : 'Pendiente de integración'}</dd></div></dl>
        <Preparation task={task} />
      </section>
      <section className="grid gap-3" aria-labelledby="task-version"><h2 id="task-version" className="staff-section-title">Configuración publicada</h2>
        <p>{task.publishedVersion ? `Versión ${task.publishedVersion.version}` : 'Sin versión publicada'}</p></section>
      <Notice title="Apoyo pedagógico, no diagnóstico"><p>{task.pedagogicalNotice}</p></Notice>
    </>}
  </div>;
}
