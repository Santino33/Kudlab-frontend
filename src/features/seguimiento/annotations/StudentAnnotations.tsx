import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import type { Student } from '../../academico/students/types.ts';
import type { DraftLease, DraftSlot, StudentRefresh } from '../../academico/students/student-drafts.ts';
import type { HttpResult } from '../../usuarios/types.ts';
import type { AnnotationsApi } from './api.ts';
import { annotationMessages, annotationTextIssue } from './types.ts';
import type { Annotation, AnnotationField, AnnotationsList } from './types.ts';
import { parseAnnotationDraft } from './draft.ts';
import type { AnnotationDraft } from './draft.ts';

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
type History = { data?: AnnotationsList; status: 'loading' | 'ready' | 'unavailable' };
const emptyDraft = (): AnnotationDraft => ({ mode: 'create', text: '' });

export function StudentAnnotations({ api, student, refresh, draft, lease, recheck, onAccessLost }: {
  api: AnnotationsApi; student: Student; refresh: StudentRefresh; draft: DraftSlot<AnnotationDraft>;
  lease: NonNullable<DraftLease>; recheck(): void; onAccessLost(): void;
}) {
  const [opened, setOpened] = useState(() => Boolean(parseAnnotationDraft(draft.read())));
  const [value, setValue] = useState<AnnotationDraft>(() => parseAnnotationDraft(draft.read()) ?? emptyDraft());
  const valueRef = useRef(value), slot = useRef(draft); slot.current = draft;
  const [history, setHistory] = useState<History>({ status: 'loading' });
  const [reload, setReload] = useState(0), [busy, setBusy] = useState(false), busyRef = useRef(false);
  const [message, setMessage] = useState(''), [issue, setIssue] = useState<string>();
  const [deleting, setDeleting] = useState<Annotation>(), [denied, setDenied] = useState(false);
  const requests = useRef(new Set<AbortController>()), mounted = useRef(true), readSequence = useRef(0);
  const textRef = useRef<HTMLTextAreaElement>(null), cancelRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const valid = () => mounted.current && lease.valid();
  function update(next: AnnotationDraft) {
    if (!valid()) return;
    valueRef.current = next; slot.current.write(next); setValue(next);
  }
  function lost() {
    if (!valid()) return;
    slot.current.write(undefined); setDenied(true); setDeleting(undefined); setHistory({ status: 'unavailable' });
    setValue(emptyDraft()); valueRef.current = emptyDraft(); onAccessLost();
  }
  useEffect(() => {
    mounted.current = true;
    const stop = () => { for (const request of requests.current) request.abort(); requests.current.clear(); setDeleting(undefined); setDenied(true); };
    const unregister = lease.onStop(stop);
    return () => { mounted.current = false; unregister(); for (const request of requests.current) request.abort(); requests.current.clear(); };
  }, [lease]);
  useEffect(() => {
    if (opened && valueRef.current.focus === 'text' && refresh.status === 'ready' && valid()) textRef.current?.focus();
  }, [opened, refresh.status]);

  async function read(cursor?: string) {
    if (!valid() || refresh.status !== 'ready') return;
    const count = ++readSequence.current, request = new AbortController(); requests.current.add(request);
    setHistory(current => ({ ...current, status: 'loading' }));
    const result = await api.list(student.id, request.signal, cursor);
    requests.current.delete(request);
    if (!valid() || request.signal.aborted || count !== readSequence.current || result.kind === 'obsolete') return;
    if (result.kind === 'success') {
      setHistory(current => ({ status: 'ready', data: { ...result.data,
        items: cursor && current.data ? [...current.data.items, ...result.data.items.filter(item => !current.data!.items.some(old => old.id === item.id))] : result.data.items } }));
      return;
    }
    if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { lost(); return; }
    setHistory(current => ({ ...current, status: 'unavailable' }));
  }
  useEffect(() => {
    if (!opened || refresh.status !== 'ready') { readSequence.current++; return; }
    void read();
    return () => { readSequence.current++; };
  }, [api, student.id, opened, refresh.revision, refresh.status, reload]);

  const inactive = !student.isActive || history.data?.isActive === false;
  const locked = inactive || refresh.status !== 'ready' || history.status !== 'ready' || busy || !lease.valid() || Boolean(value.uncertain);
  const editing = value.mode === 'edit' ? history.data?.items.find(item => item.id === value.annotationId) : undefined;
  const canSave = !locked && (value.mode === 'create' ? history.data?.canCreate : editing?.canEdit);

  function reset() {
    if (!valid() || busyRef.current) return;
    slot.current.write(undefined); valueRef.current = emptyDraft(); setValue(valueRef.current); setIssue(undefined);
  }
  function edit(item: Annotation) {
    if (locked || !item.canEdit) return;
    update({ mode: 'edit', annotationId: item.id, text: item.text, focus: 'text' }); setIssue(undefined); setMessage('');
    requestAnimationFrame(() => { if (valid()) textRef.current?.focus(); });
  }
  async function mutate(remove?: Annotation) {
    if (!valid() || busyRef.current || locked || !remove && !canSave) return;
    if (navigator.onLine === false) { setMessage('Sin conexión: no se envió la operación. El texto se conserva; vuelve a intentarlo al recuperar la conexión.'); return; }
    const request = new AbortController(); requests.current.add(request); busyRef.current = true; setBusy(true); setMessage('');
    // Mark uncertainty before sending, so a sealed host never needs a late write from an old handle.
    update({ ...valueRef.current, uncertain: true });
    const result: HttpResult<unknown, AnnotationField> = remove ? await api.remove(remove, request.signal)
      : valueRef.current.mode === 'edit' && editing ? await api.update(editing, valueRef.current.text, request.signal)
      : await api.create(student.id, valueRef.current.text, request.signal);
    requests.current.delete(request);
    if (!valid() || request.signal.aborted || result.kind === 'obsolete') return;
    busyRef.current = false; setBusy(false);
    if (result.kind === 'success') {
      setDeleting(undefined);
      if (!remove) reset(); else update({ ...valueRef.current, uncertain: false });
      setMessage(remove ? 'Anotación borrada y confirmada.' : 'Anotación guardada y confirmada por el servidor.');
      setReload(n => n + 1);
      if (remove) requestAnimationFrame(() => { if (valid()) headingRef.current?.focus(); });
      return;
    }
    if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { lost(); return; }
    if (result.kind === 'error' && !result.uncertain) {
      update({ ...valueRef.current, uncertain: false });
      setMessage(result.fields?.map(field => field.reason).join(' ') || 'El servidor rechazó la operación. Revisa los datos y el estado actual.');
      if (result.status === 400) setIssue(result.fields?.find(field => field.field === 'text')?.reason);
      if (result.status === 409) { setDeleting(undefined); setReload(n => n + 1); recheck(); }
      return;
    }
    setDeleting(undefined); setMessage('No pudimos confirmar el resultado. Consulta el historial antes de decidir otra operación; no se reenviará automáticamente.');
    setHistory(current => ({ ...current, status: 'unavailable' }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = annotationTextIssue(valueRef.current.text); setIssue(problem);
    if (problem) { textRef.current?.focus(); return; }
    void mutate();
  }

  if (denied || !lease.valid()) return <p role="status">Las anotaciones se retiraron mientras se comprueba el acceso.</p>;
  return <section aria-labelledby="annotations-title" className="space-y-6 rounded-xl border border-border bg-white p-5 sm:p-8 [overflow-wrap:anywhere]">
    <header className="space-y-2"><h2 id="annotations-title" ref={headingRef} tabIndex={-1} className="text-xl font-semibold">Anotaciones cualitativas</h2>
      <p className="text-base">Contexto docente de {student.firstName} {student.lastName}. No modifica observaciones, notas ni indicadores.</p></header>
    {!opened ? <Button variant="outline" onClick={() => setOpened(true)}>Abrir anotaciones</Button> : <>
      <p role="status" className="empty:hidden">{message}</p>
      {inactive && <p role="status">{annotationMessages.inactive}</p>}
      {refresh.status !== 'ready' && <p role="status">Comprobando el ámbito académico. El borrador se conserva, pero las escrituras están bloqueadas.</p>}
      {history.status === 'loading' && <p role="status">Consultando anotaciones…</p>}
      {history.status === 'unavailable' && <Alert><AlertDescription>No pudimos actualizar el historial. Esto no significa que esté vacío.
        {history.data && ' Los registros visibles corresponden a la última consulta autorizada.'}
        <Button className="mt-4" variant="outline" onClick={() => setReload(n => n + 1)}>Reintentar consulta</Button></AlertDescription></Alert>}
      <div className="space-y-4"><h3 className="text-lg font-semibold">{value.mode === 'edit' ? 'Editar anotación propia' : 'Nueva anotación'}</h3>
        <form noValidate onSubmit={submit} className="space-y-4" aria-busy={busy}>
          <Field><Label htmlFor="annotation-text">Texto de la anotación</Label>
            <textarea id="annotation-text" ref={textRef} rows={5} required autoComplete="off" readOnly={inactive || Boolean(value.uncertain)} disabled={busy}
              className="min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-base leading-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:bg-disabled"
              value={value.text} aria-invalid={Boolean(issue)} aria-describedby={`annotation-help annotation-count${issue ? ' annotation-error' : ''}`}
              onFocus={() => update({ ...valueRef.current, focus: 'text' })}
              onChange={event => update({ ...valueRef.current, text: event.target.value, focus: 'text' })} />
            <FieldDescription id="annotation-help">Texto plano, hasta 1.000 caracteres. Autor y fechas se registran en el servidor; no se conservan versiones anteriores.</FieldDescription>
            <p id="annotation-count" className="text-sm tabular-nums">{[...value.text].length.toLocaleString('es-CO')} / 1.000 caracteres</p>
            {issue && <FieldError id="annotation-error">{issue}</FieldError>}
          </Field>
          {value.mode === 'edit' && !editing && <p>Carga las páginas del historial hasta localizar la anotación y comprobar sus permisos antes de guardar.</p>}
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!canSave}>{busy ? 'Guardando…' : value.mode === 'edit' ? 'Guardar cambios' : 'Guardar anotación'}</Button>
            {value.mode === 'edit' && <Button type="button" variant="outline" disabled={busy || Boolean(value.uncertain)} onClick={reset}>Cancelar edición</Button>}</div>
          {value.uncertain && <Alert><AlertDescription>Hay una operación sin confirmar. El borrador no demuestra que el servidor haya guardado o descartado el envío.
            <div className="mt-4 flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => setReload(n => n + 1)}>Consultar estado actual</Button>
              <Button type="button" variant="outline" disabled={history.status !== 'ready' || busy} onClick={() => { update({ ...valueRef.current, uncertain: false }); setMessage('Revisa el historial antes de guardar de nuevo. Otra creación podría duplicar el contexto.'); }}>Ya revisé el historial</Button></div>
          </AlertDescription></Alert>}
        </form>
      </div>
      <div className="space-y-4"><h3 className="text-lg font-semibold">Historial de anotaciones</h3>
        {history.data && !history.data.items.length && <p>Aún no hay anotaciones registradas para este estudiante.</p>}
        <ol className="space-y-6">{history.data?.items.map(item => <li key={item.id} className="space-y-3 border-t border-border pt-4">
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{item.text}</p>
          <p className="text-sm text-muted">{item.author.name} · Registrada el <time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time>
            {item.updatedAt && <> · Editada el <time dateTime={item.updatedAt}>{dateFormat.format(new Date(item.updatedAt))}</time></>}</p>
          {(item.canEdit || item.canDelete) && <div className="flex flex-wrap gap-3">
            {item.canEdit && <Button variant="outline" disabled={locked} onClick={() => edit(item)}>Editar anotación</Button>}
            {item.canDelete && <Button id={`annotation-delete-${item.id}`} variant="outline" disabled={locked} onClick={() => setDeleting(item)}>Borrar anotación</Button>}
          </div>}
        </li>)}</ol>
        {history.data?.nextCursor && <Button variant="outline" disabled={busy || history.status !== 'ready' || refresh.status !== 'ready'} onClick={() => void read(history.data!.nextCursor!)}>Cargar más anotaciones</Button>}
      </div>
    </>}
    <AlertDialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !busy) setDeleting(undefined); }}>
      <AlertDialogContent initialFocus={cancelRef} finalFocus={() => document.getElementById(`annotation-delete-${deleting?.id}`) ?? headingRef.current}>
        <AlertDialogHeader><AlertDialogTitle>¿Borrar esta anotación?</AlertDialogTitle><AlertDialogDescription>La anotación se eliminará del historial y no podrá recuperarse desde la aplicación. Las demás anotaciones se conservarán.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel ref={cancelRef} disabled={busy}>Cancelar</AlertDialogCancel>
          <Button disabled={locked || !deleting?.canDelete} onClick={() => { if (deleting) void mutate(deleting); }}>{busy ? 'Borrando…' : 'Confirmar borrado'}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
