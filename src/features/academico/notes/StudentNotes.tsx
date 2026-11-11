import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Student } from '../students/types.ts';
import type { StudentRefresh } from '../students/student-drafts.ts';
import { noteConflict } from './api.ts';
import type { NotesApi } from './api.ts';
import { conflictKeys, noteIssues, subjectLabels, subjects, terms } from './types.ts';
import type { Note, NoteField, NotesList, Subject, Term } from './types.ts';

type Load = { kind: 'loading' } | { kind: 'ready'; data: NotesList; stale: boolean } | { kind: 'error' } | { kind: 'hidden' };
type Editing = { note: Note } | undefined;
type Pending = { subject: Subject; term: Term; mode: 'create' | 'update' };
type Issues = Partial<Record<'subject' | 'term' | 'score', string>>;

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const when = (iso: string) => dateFormat.format(new Date(iso));

export function StudentNotes({ api, student, refresh }: { api: NotesApi; student: Student; refresh: StudentRefresh }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [subject, setSubject] = useState<Subject | undefined>();
  const [term, setTerm] = useState<Term | undefined>();
  const [scoreText, setScoreText] = useState('');
  const [editing, setEditing] = useState<Editing>();
  const [issues, setIssues] = useState<Issues>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | undefined>();
  const [notice, setNotice] = useState<{ tone: 'status' | 'alert'; text: string } | undefined>();
  const [inactive, setInactive] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Cada consulta es del estudiante actual; un cambio de estudiante reinicia la sección desde la clave del padre.
  useEffect(() => {
    const request = new AbortController();
    void api.list(student.id, request.signal).then((result) => {
      if (request.signal.aborted || result.kind === 'obsolete') return;
      if (result.kind === 'success') { setLoad({ kind: 'ready', data: result.data, stale: false }); setPending(undefined); return; }
      // 401/403/404 retiran de inmediato la lista y cualquier borrador; el flujo global decide el resto.
      if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { setLoad({ kind: 'hidden' }); setEditing(undefined); setScoreText(''); return; }
      // Un fallo transitorio conserva la última lista correcta, rotulada como de la última consulta.
      setLoad((current) => (current.kind === 'ready' ? { ...current, stale: true } : { kind: 'error' }));
    });
    return () => request.abort();
  }, [api, student.id, reloadKey]);

  const reload = () => setReloadKey((value) => value + 1);
  const blocked = !student.isActive || inactive;
  const unverified = refresh.status !== 'ready';
  const locked = blocked || unverified || busy || Boolean(pending) || load.kind !== 'ready';

  function say(tone: 'status' | 'alert', text: string) {
    setNotice({ tone, text });
    requestAnimationFrame(() => { if (mounted.current) noticeRef.current?.focus(); });
  }
  function applyFieldProblems(fields: { field: NoteField; reason: string }[] | undefined) {
    const next: Issues = {};
    for (const item of fields ?? []) if (item.field === 'subject' || item.field === 'term' || item.field === 'score') next[item.field] = item.reason;
    setIssues(next);
  }
  function startEdit(note: Note) {
    if (locked) return;
    setEditing({ note }); setSubject(note.subject); setTerm(note.term); setScoreText(note.score); setIssues({}); setNotice(undefined);
    requestAnimationFrame(() => scoreRef.current?.focus());
  }
  function cancelEdit() { setEditing(undefined); setSubject(undefined); setTerm(undefined); setScoreText(''); setIssues({}); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    const found = noteIssues({ subject, term, scoreText });
    setIssues(found);
    if (Object.keys(found).length) { say('alert', 'Revisa los campos indicados. No se envió la nota.'); return; }
    if (load.kind !== 'ready') return;
    const existing = editing?.note ?? load.data.items.find((item) => item.subject === subject && item.term === term);
    if (!editing && existing) { say('alert', `${conflictKeys.exists}`); return; }
    // Fallo antes del envío (CA-10): sin conexión no se envía nada y el formulario conserva lo escrito.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      say('alert', 'No hay conexión. La nota no se envió y lo que escribiste sigue en el formulario; vuelve a guardar cuando recuperes la conexión.');
      return;
    }
    const mode: Pending['mode'] = editing ? 'update' : 'create';
    setBusy(true); setNotice(undefined);
    const result = editing ? await api.update(student.id, editing.note, scoreText, new AbortController().signal)
      : await api.create(student.id, { subject: subject!, term: term!, scoreText }, new AbortController().signal);
    if (!mounted.current || result.kind === 'obsolete') return;
    setBusy(false);
    if (result.kind === 'success') {
      cancelEdit(); reload();
      say('status', mode === 'create' ? 'Nota guardada y confirmada por el servidor.' : 'Nota actualizada y confirmada por el servidor.');
      return;
    }
    const conflict = noteConflict(result);
    if (conflict === 'inactive') { setInactive(true); cancelEdit(); say('alert', conflictKeys.inactive); return; }
    if (conflict === 'exists') { reload(); say('alert', conflictKeys.exists); return; }
    if (conflict === 'stale') { setEditing(undefined); reload(); say('alert', conflictKeys.stale); return; }
    if (result.kind === 'error' && result.status === 400) {
      applyFieldProblems(result.fields);
      say('alert', 'El servidor no aceptó los datos. Revisa los campos indicados.');
      return;
    }
    if (result.kind === 'error' && [401, 403, 404].includes(result.status)) { setLoad({ kind: 'hidden' }); cancelEdit(); return; }
    // Resultado desconocido (CA-14): puede haberse guardado; no se reenvía hasta comprobar el estado actual.
    setPending({ subject: subject!, term: term!, mode });
    say('alert', 'No pudimos confirmar el guardado. Comprueba el estado actual antes de volver a enviar.');
  }

  const heading = load.kind === 'ready' ? `Notas académicas · Año ${load.data.schoolYear}` : 'Notas académicas';
  const noteAt = (area: Subject, period: Term) => load.kind === 'ready' ? load.data.items.find((item) => item.subject === area && item.term === period) : undefined;
  const errorId = (field: string) => `notes-${field}-error`;

  return <section className="space-y-6" aria-labelledby="student-notes-title" aria-busy={load.kind === 'loading' || busy}>
    <div className="space-y-2">
      <h2 id="student-notes-title" className="text-xl font-semibold">{heading}</h2>
      <p className="text-sm text-muted">Calificación escolar por área y periodo, de 1.0 a 5.0 con un decimal y punto. Es información de consulta: no genera promedios ni interpretaciones.</p>
    </div>
    {notice && <div ref={noticeRef} tabIndex={-1}>{notice.tone === 'alert'
      ? <Alert><AlertDescription>{notice.text}</AlertDescription></Alert>
      : <p role="status" className="text-base font-medium">{notice.text}</p>}</div>}
    {unverified && load.kind === 'ready' && <p role="status" className="text-sm">La ficha no está actualizada: las notas se muestran como de la última comprobación y las escrituras esperan una nueva.</p>}
    {load.kind === 'loading' && <div role="status" className="space-y-3"><p className="text-base">Cargando notas…</p><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>}
    {load.kind === 'error' && <Alert><AlertDescription>No pudimos cargar las notas. Esto no significa que el estudiante no tenga notas.
      <Button variant="outline" className="mt-4" onClick={reload}>Reintentar</Button></AlertDescription></Alert>}
    {load.kind === 'hidden' && <p role="status" className="text-base">Las notas de este estudiante no están disponibles.</p>}
    {load.kind === 'ready' && <>
      {load.stale && <Alert><AlertDescription>Mostramos las notas de la última consulta; no pudimos actualizarlas.
        <Button variant="outline" className="mt-4" onClick={reload}>Reintentar</Button></AlertDescription></Alert>}
      <div className="staff-table-region" role="region" aria-label="Notas por área y periodo" tabIndex={0}>
        <Table>
          <TableCaption>Año {load.data.schoolYear} del curso actual. «Sin nota» indica que aún no hay registro, no una nota de cero.</TableCaption>
          <TableHeader><TableRow><TableHead>Área</TableHead>{terms.map((period) => <TableHead key={period} className="text-right">Periodo {period}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{subjects.map((area) => <TableRow key={area}>
            <TableHead scope="row">{subjectLabels[area]}</TableHead>
            {terms.map((period) => {
              const note = noteAt(area, period);
              return <TableCell key={period} className="text-right">{note
                ? <div className="flex flex-col items-end gap-2"><span className="font-semibold tabular-nums">{note.score}</span>
                  {!blocked && <Button variant="outline" disabled={locked} onClick={() => startEdit(note)} aria-label={`Actualizar ${subjectLabels[area]}, periodo ${period}`}>Actualizar</Button>}</div>
                : <span>Sin nota</span>}</TableCell>;
            })}
          </TableRow>)}</TableBody>
        </Table>
      </div>
      {blocked
        ? <p role="status" className="text-base">Este estudiante está inactivo: las notas solo se pueden consultar.</p>
        : <form noValidate className="space-y-6" onSubmit={submit} aria-busy={busy}>
          <h3 className="text-lg font-semibold">{editing ? `Actualizar ${subjectLabels[editing.note.subject]} · Periodo ${editing.note.term}` : 'Registrar una nota'}</h3>
          {!editing && <>
            <FieldSet aria-describedby={issues.subject ? errorId('subject') : undefined}>
              <FieldLegend>Área</FieldLegend>
              {subjects.map((area) => <label key={area} className="flex min-h-11 items-center gap-3 text-base">
                <input type="radio" name="notes-subject" className="size-5" value={area} checked={subject === area} disabled={locked}
                  onChange={() => { setSubject(area); setIssues((current) => ({ ...current, subject: undefined })); }} />{subjectLabels[area]}</label>)}
              {issues.subject && <FieldError id={errorId('subject')}>{issues.subject}</FieldError>}
            </FieldSet>
            <FieldSet aria-describedby={issues.term ? errorId('term') : undefined}>
              <FieldLegend>Periodo</FieldLegend>
              <div className="flex flex-wrap gap-x-6">{terms.map((period) => <label key={period} className="flex min-h-11 items-center gap-3 text-base">
                <input type="radio" name="notes-term" className="size-5" value={period} checked={term === period} disabled={locked}
                  onChange={() => { setTerm(period); setIssues((current) => ({ ...current, term: undefined })); }} />Periodo {period}</label>)}</div>
              {issues.term && <FieldError id={errorId('term')}>{issues.term}</FieldError>}
            </FieldSet>
          </>}
          <Field>
            <Label htmlFor="notes-score">Nota</Label>
            <Input id="notes-score" ref={scoreRef} inputMode="decimal" autoComplete="off" value={scoreText} disabled={locked}
              aria-invalid={Boolean(issues.score)} aria-describedby={`notes-score-help${issues.score ? ` ${errorId('score')}` : ''}`}
              onChange={(event) => { setScoreText(event.target.value); setIssues((current) => ({ ...current, score: undefined })); }} />
            <FieldDescription id="notes-score-help">De 1.0 a 5.0, con un decimal y punto. Por ejemplo, 4.5.</FieldDescription>
            {issues.score && <FieldError id={errorId('score')}>{issues.score}</FieldError>}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={locked}>{busy ? 'Guardando…' : editing ? 'Guardar cambio' : 'Guardar nota'}</Button>
            {editing && <Button variant="outline" disabled={busy} onClick={cancelEdit}>Cancelar</Button>}
          </div>
          {pending && <div className="space-y-3"><p className="text-base">El último envío ({subjectLabels[pending.subject]}, periodo {pending.term}) no se pudo confirmar. La escritura queda bloqueada hasta comprobar el estado.</p>
            <Button variant="outline" onClick={reload}>Comprobar estado actual</Button></div>}
          {!pending && <p className="text-sm text-muted">Si ocultas o cambias de pestaña antes de guardar, el valor escrito no se conserva. Autor y fecha los registra el servidor.</p>}
        </form>}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Cambios registrados</h3>
        {load.data.items.length === 0 ? <p className="text-base">Aún no hay notas registradas en este año.</p>
          : load.data.items.map((note) => <details key={note.id} className="rounded-lg border border-border p-4">
            <summary className="min-h-11 cursor-pointer text-base font-medium">{subjectLabels[note.subject]} · Periodo {note.term}: {note.score} ({note.revisions.length} {note.revisions.length === 1 ? 'registro' : 'registros'})</summary>
            <ol className="mt-3 space-y-2 text-base">{[...note.revisions].reverse().map((revision) => <li key={revision.version}>
              <span className="font-semibold tabular-nums">{revision.score}</span> · {revision.authorName} · <time dateTime={revision.recordedAt}>{when(revision.recordedAt)}</time></li>)}</ol>
          </details>)}
      </div>
    </>}
  </section>;
}
