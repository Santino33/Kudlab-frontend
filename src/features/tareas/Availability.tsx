import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useMutation } from '../usuarios/hooks';
import type { TasksApi } from './api';
import type { TaskSummary } from './types';

export function useAvailability(api: TasksApi, reload: () => void) {
  const mutation = useMutation<TaskSummary>();
  const [notice, setNotice] = useState<{ id: string; text: string; review: boolean }>();
  const refresh = useRef(reload);
  refresh.current = reload;
  const busy = useRef(false);
  useEffect(() => {
    const focus = () => { if (!busy.current) refresh.current(); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, []);
  async function change(task: TaskSummary, enabled: boolean) {
    if (busy.current || notice?.review) return;
    busy.current = true;
    setNotice({ id: task.id, text: 'Guardando disponibilidad…', review: false });
    const result = await mutation.run(signal => api.setAvailability(task.id, enabled, task.revision, signal));
    busy.current = false;
    if (!result || result.kind === 'obsolete') return;
    if (result.kind === 'success') {
      setNotice({ id: task.id, text: result.data.isEnabled === enabled ? 'Disponibilidad guardada.' : 'La disponibilidad cambió en otra sesión. Consulta el estado actual.', review: false });
      refresh.current();
    } else {
      setNotice({ id: task.id, review: true, text: result.kind === 'error' && result.status === 409
        ? 'La tarea cambió en otra sesión. Consulta el estado actual antes de volver a cambiarla.'
        : 'No pudimos confirmar el cambio. Consulta el estado actual antes de volver a intentarlo.' });
    }
  }
  async function review(id: string) {
    if (busy.current) return;
    busy.current = true;
    const result = await mutation.run(signal => api.detail(id, signal));
    busy.current = false;
    if (result?.kind === 'success') {
      setNotice({ id, text: 'Estado actual consultado. Puedes decidir si deseas cambiarlo.', review: false });
      refresh.current();
    } else if (result && result.kind !== 'obsolete') {
      setNotice({ id, text: 'No pudimos consultar el estado. Vuelve a intentarlo cuando recuperes la conexión.', review: true });
    }
  }
  return { change, review, notice, pending: mutation.pending, locked: mutation.pending || Boolean(notice?.review) };
}

export function TaskAvailability({ task, admin, control, fetching }: {
  task: TaskSummary; admin: boolean; control: ReturnType<typeof useAvailability>; fetching: boolean;
}) {
  const id = useId(), notice = control.notice?.id === task.id ? control.notice : undefined;
  return <div className="grid min-w-0 gap-3 whitespace-normal [overflow-wrap:anywhere]">
    <span className="task-state w-fit">Estado: {task.isEnabled ? 'Habilitada' : 'Deshabilitada'}</span>
    {admin ? <>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Switch id={id} checked={task.isEnabled} disabled={control.locked || fetching}
          aria-describedby={`${id}-help`} onCheckedChange={enabled => { void control.change(task, enabled); }} />
        <label htmlFor={id} className="min-w-0 flex-1 basis-48 cursor-pointer text-sm">Habilitar {task.title} para nuevas asignaciones</label>
      </div>
      <p id={`${id}-help`} className="text-sm">Las asignaciones existentes podrán completarse.</p>
      <p role="status" aria-live="polite" className="text-sm">{notice?.text}</p>
      {notice?.review && <Button variant="outline" disabled={control.pending || fetching} onClick={() => { void control.review(task.id); }}>Consultar estado actual</Button>}
    </> : <p className="text-sm">Estado administrativo</p>}
  </div>;
}
