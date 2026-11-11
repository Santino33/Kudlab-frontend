import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { ConsentsApi } from './api.ts';
import type { ConsentDraft, ConsentEvent, ConsentSnapshot } from './types.ts';
import { fieldMessages } from './types.ts';
import { consentFieldMessage, registrationFields, validateConsentDraft } from './validation.ts';
import { ConsentFeedback } from './ConsentFeedback.tsx';
import { operationHandle } from './operation-handle.ts';
import type { ConsentChange, DraftLease, StudentRefresh } from '../students/student-drafts.ts';

export function StudentConsent({ api, studentId, actorId, snapshot, refresh, lease, onChange, recheck }: {
  api: ConsentsApi; studentId: string; actorId: string; snapshot?: ConsentSnapshot; refresh: StudentRefresh; lease: NonNullable<DraftLease>;
  onChange(change: ConsentChange): void; recheck(): void;
}) {
  const slot = useRef(lease.slot('consent')).current;
  const handle = useRef(operationHandle(sessionStorage)).current;
  const [draft, setDraft] = useState<ConsentDraft>(() => slot.read() ?? { signedOn: '', receivedOn: '' });
  const currentDraft = useRef(draft);
  const [pendingId, setPendingId] = useState(() => draft.operation?.requestId ?? handle.read(actorId, studentId)?.requestId);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [revoking, setRevoking] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null), reasonInput = useRef<HTMLTextAreaElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ sequence: number; message: string }>();
  const feedbackSequence = useRef(0);
  const [events, setEvents] = useState<ConsentEvent[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const requests = useRef(new Set<AbortController>()), urls = useRef(new Set<string>()), alive = useRef(true);
  const summary = useRef<HTMLParagraphElement>(null), input = useRef<HTMLInputElement>(null);
  const historySequence = useRef(0);
  const historyDenied = useRef(false);
  const authorized = () => alive.current && lease.valid();
  function update(value: ConsentDraft) { if (authorized()) { currentDraft.current = value; slot.write(value); setDraft(value); } }
  function edit(value: ConsentDraft) { update({ ...value, baseVersion: value.baseVersion ?? snapshot?.consent.version }); }
  function editRegistration(value: ConsentDraft, field: typeof registrationFields[number]) {
    if (!authorized()) return;
    if (feedback) { setFeedback(undefined); setMessage(''); }
    edit(value);
    const issues = validateConsentDraft(value);
    setErrors(old => {
      const next = { ...old };
      if (old[field]) { delete next[field]; if (issues[field]) next[field] = issues[field]; }
      if (field === 'receivedOn' && old.signedOn === consentFieldMessage('signedOn', 'date_order')) {
        delete next.signedOn; if (issues.signedOn) next.signedOn = issues.signedOn;
      }
      return next;
    });
  }
  function focusRegistrationError(issues: Record<string, string>) {
    requestAnimationFrame(() => {
      if (!authorized()) return;
      const field = registrationFields.find(key => issues[key] && !document.querySelector<HTMLInputElement>(`#consent-${key}`)?.disabled);
      const target = field ? document.getElementById(`consent-${field}`) : summary.current;
      target?.focus(); target?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }
  function registrationError(issues: Record<string, string>, fallback = 'Revisa la información y el formato del documento antes de continuar.', uncertain = Boolean(pendingId)) {
    setErrors(issues);
    const text = `${uncertain ? 'El guardado anterior sigue por confirmar. No se volvió a enviar el documento.' : 'No se registró el consentimiento.'} ${Object.values(issues).filter(Boolean).join(' ') || fallback}`;
    setMessage(text);
    setFeedback({ sequence: ++feedbackSequence.current, message: text });
    focusRegistrationError(issues);
  }
  function controller() { const value = new AbortController(); requests.current.add(value); return value; }
  useEffect(() => {
    alive.current = true;
    const stop = () => {
      alive.current = false;
      setFeedback(undefined);
      for (const request of requests.current) request.abort(); requests.current.clear();
      for (const url of urls.current) URL.revokeObjectURL(url); urls.current.clear();
    };
    const remove = lease.onStop(stop);
    if (draft.focus) document.getElementById(draft.focus)?.focus();
    return () => { remove(); stop(); };
  }, [lease]);
  async function history(next: string | null = null) {
    const sequence = ++historySequence.current, request = controller();
    setHistoryState('loading');
    const result = await api.history(studentId, next, request.signal); requests.current.delete(request);
    if (!authorized() || sequence !== historySequence.current) return;
    if (result.kind === 'success') { historyDenied.current = false; setEvents(old => next ? [...old, ...result.data.items] : result.data.items); setCursor(result.data.nextCursor); setHistoryState('ready'); }
    else { setHistoryState('unavailable'); if (result.kind === 'error' && result.status === 404 && !historyDenied.current) { historyDenied.current = true; recheck(); } }
  }
  useEffect(() => { void history(); }, [refresh.revision]);
  function confirmed(requestId: string, action: 'REGISTER' | 'REVOKE' = 'REGISTER') {
    setFeedback(undefined); setErrors({});
    handle.clear(); setPendingId(undefined); setRevoking(false);
    update(action === 'REVOKE' ? { ...currentDraft.current, revocation: undefined, operation: undefined, phase: undefined } : { signedOn: '', receivedOn: '' });
    if (action === 'REGISTER' && input.current) input.current.value = '';
    setMessage(action === 'REVOKE' ? 'La revocación se guardó. Revocar no cambia por sí solo si el estudiante está activo o inactivo.' : 'El consentimiento se guardó. Consulta el estado actual del estudiante en esta sección.');
    onChange({ studentId, requestId, outcome: 'confirmed' });
  }
  async function reconcile() {
    if (!pendingId || busy || !authorized()) return;
    setBusy(true); const request = controller();
    const result = await api.operation(studentId, pendingId, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    setBusy(false);
    if (result.kind === 'success') {
      if (result.data.status === 'COMMITTED') { confirmed(pendingId, result.data.action); return; }
      if (result.data.status === 'REJECTED') {
        handle.clear(); setPendingId(undefined); update({ ...currentDraft.current, operation: undefined, phase: undefined, reviewRequired: true });
        setMessage('Este documento no se registró porque la información cambió. Revisa el estado actual antes de guardarlo de nuevo.'); recheck(); return;
      }
      const a = result.data.attempt;
      update({ ...currentDraft.current, signedOn: a.signedOn!, receivedOn: a.receivedOn!, phase: 'retry',
        operation: { requestId: pendingId, expectedVersion: a.expectedVersion, signedOn: a.signedOn!, receivedOn: a.receivedOn! } });
      setMessage('El guardado sigue pendiente. Selecciona el mismo documento y pulsa Volver a enviar el mismo documento. Conservaremos las fechas para evitar un registro duplicado.');
    } else {
      setMessage('Todavía no pudimos comprobar si se guardó. No lo des por registrado ni por perdido. Pulsa Comprobar si se guardó para consultar de nuevo.');
      if (result.kind === 'error' && result.status === 404) {
        if (currentDraft.current.operation) update({ ...currentDraft.current, phase: 'retry' });
        recheck();
      }
    }
  }
  useEffect(() => { if (pendingId) void reconcile(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || currentDraft.current.phase === 'sending' || !authorized() || !snapshot || refresh.status !== 'ready' || needsReview ||
      draft.operation && 'reason' in draft.operation || pendingId && draft.phase !== 'retry') return;
    const issues = validateConsentDraft(draft);
    setErrors(issues);
    if (Object.keys(issues).length) { registrationError(issues); return; }
    setFeedback(undefined);
    const metadata = draft.operation ?? { requestId: crypto.randomUUID(), expectedVersion: draft.baseVersion ?? snapshot.consent.version, signedOn: draft.signedOn, receivedOn: draft.receivedOn };
    update({ ...draft, operation: metadata, phase: 'sending' }); setPendingId(metadata.requestId);
    handle.write({ actorId, studentId, requestId: metadata.requestId }); setBusy(true); setMessage('Estamos guardando el documento. Espera la confirmación.');
    const request = controller(), result = await api.register(studentId, metadata, draft.file!, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    setBusy(false);
    if (result.kind === 'success') { confirmed(metadata.requestId); return; }
    const conflict = result.kind === 'error' && result.fields?.find(field => field.field === 'operation')?.reason;
    if (result.kind === 'obsolete' || 'uncertain' in result && result.uncertain || result.kind === 'unavailable' || conflict === 'REQUEST_REUSED' || conflict === 'EVIDENCE_MISMATCH') {
      update({ ...currentDraft.current, phase: 'uncertain' });
      setMessage('No pudimos comprobar si el documento se guardó. Pulsa Comprobar si se guardó antes de enviarlo otra vez.');
      onChange({ studentId, requestId: metadata.requestId, outcome: 'uncertain' });
    } else {
      handle.clear(); setPendingId(undefined); update({ ...currentDraft.current, operation: undefined, phase: undefined, reviewRequired: Boolean(conflict) });
      const issues = result.kind === 'error' ? Object.fromEntries((result.fields ?? []).map(field => [field.field, consentFieldMessage(field.field, field.reason)])) : {};
      registrationError(issues, conflict ? fieldMessages[conflict] : undefined, false);
      if (result.kind === 'error' && [404, 409].includes(result.status)) recheck();
      return;
    }
    requestAnimationFrame(() => { if (authorized()) summary.current?.focus(); });
  }
  function openRevocation() {
    if (!authorized() || !snapshot || refresh.status !== 'ready' || busy) return;
    if (pendingId) {
      if (draft.phase !== 'retry' || !draft.operation || !('reason' in draft.operation)) return;
    } else {
      if (snapshot.consent.state !== 'CURRENT' || !snapshot.consent.currentRecord) return;
      update({ ...currentDraft.current, revocation: { expectedVersion: snapshot.consent.version,
        recordId: snapshot.consent.currentRecord.id, reason: currentDraft.current.revocation?.reason ?? '' } });
    }
    setFeedback(undefined); setErrors(old => ({ ...old, reason: '' })); setMessage(''); setRevoking(true);
  }
  async function revoke(event: FormEvent) {
    event.preventDefault();
    if (busy || currentDraft.current.phase === 'sending' || !authorized() || !snapshot || refresh.status !== 'ready') return;
    const previous = currentDraft.current.operation;
    const values = previous && 'reason' in previous ? previous : currentDraft.current.revocation;
    if (!values || pendingId && (draft.phase !== 'retry' || !previous || !('reason' in previous))) return;
    if (!previous && (snapshot.consent.state !== 'CURRENT' || values.expectedVersion !== snapshot.consent.version || values.recordId !== snapshot.consent.currentRecord?.id)) {
      setRevoking(false); setMessage('El consentimiento cambió. Revisa el estado actual antes de volver a abrir la revocación.'); recheck(); return;
    }
    if (!values.reason.trim() || values.reason.trim().length > 2000) {
      setErrors(old => ({ ...old, reason: 'Escribe el motivo o la referencia de la comunicación, hasta 2 000 caracteres.' })); reasonInput.current?.focus(); return;
    }
    const operation = previous && 'reason' in previous ? previous : { ...values, reason: values.reason.trim(), requestId: crypto.randomUUID() };
    update({ ...currentDraft.current, operation, phase: 'sending' }); setPendingId(operation.requestId);
    handle.write({ actorId, studentId, requestId: operation.requestId }); setBusy(true);
    const request = controller(), result = await api.revoke(studentId, operation, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    setBusy(false); setRevoking(false);
    if (result.kind === 'success') { confirmed(operation.requestId, 'REVOKE'); return; }
    const conflict = result.kind === 'error' && result.fields?.find(field => field.field === 'operation')?.reason;
    if (result.kind === 'obsolete' || 'uncertain' in result && result.uncertain || result.kind === 'unavailable' || conflict === 'REQUEST_REUSED') {
      update({ ...currentDraft.current, phase: 'uncertain' });
      setMessage('No pudimos comprobar si la revocación se guardó. Pulsa Comprobar si se guardó antes de intentarlo otra vez.');
      onChange({ studentId, requestId: operation.requestId, outcome: 'uncertain' });
    } else {
      handle.clear(); setPendingId(undefined); update({ ...currentDraft.current, operation: undefined, phase: undefined });
      setMessage(conflict ? fieldMessages[conflict] : 'No se registró la revocación. Revisa el motivo antes de intentarlo de nuevo.');
      if (result.kind === 'error' && [404, 409].includes(result.status)) recheck();
    }
  }
  async function download(recordId: string) {
    const request = controller(), result = await api.document(studentId, recordId, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    if (result.kind !== 'success') { setMessage('No pudimos descargar el documento ahora. Puedes intentarlo de nuevo. Este problema de descarga no modifica el consentimiento registrado.'); if (result.kind === 'error' && result.status === 404) recheck(); return; }
    const url = URL.createObjectURL(result.data); urls.current.add(url);
    const link = document.createElement('a'); link.href = url;
    link.download = `consentimiento-${recordId}.${result.data.type === 'application/pdf' ? 'pdf' : result.data.type === 'image/png' ? 'png' : 'jpg'}`;
    link.click(); setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
  }
  const frozen = busy || Boolean(pendingId), available = Boolean(snapshot) && refresh.status === 'ready';
  const revokeAttempt = draft.operation && 'reason' in draft.operation ? draft.operation : undefined;
  const needsReview = Boolean(!pendingId && (draft.reviewRequired || snapshot && draft.baseVersion !== undefined && draft.baseVersion !== snapshot.consent.version));
  return <section className="rounded-xl border border-border bg-white p-5 sm:p-8" aria-labelledby="consent-title">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="consent-title" className="text-xl font-semibold">Consentimiento informado</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">Registra el documento firmado por el acudiente. Al confirmar el guardado, el estudiante se activa automáticamente; no necesitas otro botón de activación.</p></div>
      <span className="account-status">{refresh.status === 'checking' ? 'Comprobando…' : !available ? 'No se pudo comprobar' : snapshot!.consent.state === 'NONE' ? 'Sin registro' : snapshot!.consent.state === 'CURRENT' ? 'Vigente' : 'Revocado'}</span>
    </header>
    <Button className="mt-4" variant="outline" disabled={refresh.status === 'checking'} onClick={recheck}>Actualizar estado</Button>
    {available && <p className="mt-4" role="status">Estado actual del estudiante: <strong>{snapshot!.student.isActive ? 'Activo' : 'Inactivo'}</strong>. {snapshot!.consent.state === 'NONE' ? 'Aún no tiene consentimiento registrado.' : snapshot!.consent.state === 'REVOKED' ? 'El consentimiento fue revocado. Necesita uno nuevo para iniciar actividades.' : 'Tiene consentimiento vigente.'}</p>}
    {!available && <p className="mt-5">Necesitamos comprobar la información antes de guardar. Pulsa Actualizar estado. Conservamos lo que completaste mientras mantengas acceso.</p>}
    <p id="consent-result" ref={summary} tabIndex={-1} role={feedback?.message === message ? undefined : 'status'} className="mt-5 text-sm empty:hidden">{message}</p>
    {pendingId && <div className="mt-4 rounded-lg border border-border p-4"><h3 className="font-semibold">Guardado por confirmar</h3><p className="mt-1 text-sm">Primero comprobaremos si se guardó para evitar duplicados. Si recargaste la página y podemos continuar el envío, te pediremos que selecciones otra vez el documento original.</p><Button className="mt-3" variant="outline" disabled={busy} onClick={() => void reconcile()}>Comprobar si se guardó</Button>
      {revokeAttempt && draft.phase === 'retry' && <Button className="mt-3 sm:ml-3" variant="outline" disabled={busy || !available} onClick={openRevocation}>Revisar reenvío de revocación</Button>}</div>}
    <form onSubmit={submit} noValidate className="mt-6 max-w-2xl space-y-5" onFocusCapture={event => { if (event.target.id) update({ ...currentDraft.current, focus: event.target.id }); }}>
      {feedback && errors.file && authorized() && <ConsentFeedback key={feedback.sequence} message={feedback.message} />}
      <div className="space-y-2"><Label htmlFor="consent-file">Documento firmado</Label>
        <p id="consent-file-help" className="text-sm text-muted">PDF, PNG o JPEG, no vacío y de máximo 10 MiB. Revisa que el documento se pueda leer y corresponda al consentimiento firmado: el sistema solo comprueba el tipo y tamaño del archivo. Se conserva el original. Si el selector se cerró al comprobar tu acceso, vuelve a seleccionar el archivo.</p>
          <Input ref={input} id="consent-file" type="file" required className="scroll-mt-6 aria-invalid:border-foreground" accept=".pdf,.png,.jpg,.jpeg" disabled={busy || Boolean(revokeAttempt) || Boolean(pendingId && draft.phase !== 'retry')} aria-invalid={Boolean(errors.file)} aria-describedby="consent-file-help consent-file-error" onChange={event => {
          const file = event.target.files?.[0]; if (!file || !authorized()) return;
           editRegistration({ ...currentDraft.current, file }, 'file');
           if (file.size > 10485760 || !file.size) registrationError({ file: validateConsentDraft({ ...currentDraft.current, file }).file! });
        }} />
        {draft.file && <div className="flex flex-wrap items-center gap-3 text-sm"><FileText aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">Documento seleccionado: {draft.file.name} · {(draft.file.size / 1024).toFixed(1)} KiB. {pendingId ? 'El archivo seleccionado no confirma que se haya guardado.' : 'Aún no se ha registrado. Completa las fechas y pulsa Registrar consentimiento o Registrar nuevo documento.'}</span><Button type="button" variant="outline" disabled={frozen} onClick={() => { update({ ...draft, file: undefined }); if (input.current) input.current.value = ''; }}>Quitar archivo</Button></div>}
        <p id="consent-file-error" className="text-sm font-semibold empty:hidden">{errors.file}</p>
      </div>
      {feedback && !errors.file && authorized() && <ConsentFeedback key={feedback.sequence} message={feedback.message} />}
      <div className="grid gap-5 sm:grid-cols-2">{(['signedOn', 'receivedOn'] as const).map(field => <div key={field} className="space-y-2"><Label htmlFor={`consent-${field}`}>{field === 'signedOn' ? 'Fecha de firma' : 'Fecha de recepción'}</Label>
        <Input id={`consent-${field}`} type="date" required className="scroll-mt-6 aria-invalid:border-foreground" value={draft[field]} disabled={frozen} aria-invalid={Boolean(errors[field])} aria-describedby={`consent-${field}-error consent-date-help`} onChange={event => editRegistration({ ...currentDraft.current, [field]: event.target.value }, field)} />
        <p id={`consent-${field}-error`} className="text-sm font-semibold empty:hidden">{errors[field]}</p></div>)}</div>
      <p id="consent-date-help" className="text-sm text-muted">Indica cuándo firmó el acudiente y cuándo recibiste el documento. Ninguna fecha puede ser posterior a hoy en Colombia; la firma no puede ser posterior a la recepción.</p>
      {errors.operation && <p>{errors.operation}</p>}
      {needsReview && <div role="status" className="space-y-3"><p>El consentimiento cambió mientras preparabas este documento. Revisa el estado y el historial antes de continuar.</p><Button type="button" variant="outline" disabled={!available} onClick={() => { update({ ...draft, baseVersion: snapshot!.consent.version, reviewRequired: false }); setErrors({}); }}>He revisado el estado actual</Button></div>}
      <Button type="submit" disabled={busy || !available || needsReview || Boolean(revokeAttempt) || Boolean(pendingId && draft.phase !== 'retry')}>{busy ? draft.phase === 'sending' ? 'Guardando…' : 'Comprobando si se guardó…' : pendingId && !revokeAttempt ? 'Volver a enviar el mismo documento' : !snapshot || snapshot.consent.state === 'NONE' ? 'Registrar consentimiento' : 'Registrar nuevo documento'}</Button>
      <p className="text-sm text-muted">Elegir un archivo no lo guarda. Registra un documento nuevo si necesitas renovar o reemplazar el anterior. Los documentos anteriores permanecen en el historial.</p>
    </form>
    {snapshot?.consent.state === 'CURRENT' && <div className="mt-8 space-y-3"><h3 className="text-lg font-semibold">Revocar consentimiento</h3>
      <p className="max-w-2xl">Si el acudiente retira su autorización, registra aquí su comunicación. No necesitas otro archivo. El estudiante no podrá iniciar nuevas actividades; revocar no cambia por sí solo su estado activo o inactivo.</p>
      <Button id="consent-revoke" variant="outline" disabled={frozen || !available} onClick={openRevocation}>Revocar consentimiento</Button></div>}
    <AlertDialog open={revoking} onOpenChange={open => { if (!busy) setRevoking(open); }}>
      <AlertDialogContent initialFocus={cancel} finalFocus={() => document.getElementById('consent-result')?.textContent ? summary.current : document.getElementById('consent-revoke')}>
        <AlertDialogHeader><AlertDialogTitle>Revocar consentimiento</AlertDialogTitle>
          <AlertDialogDescription>El estudiante {snapshot?.student.studentCode} no podrá iniciar nuevas actividades. Las que ya inició con autorización podrán terminar y guardar sus resultados. Se conservan los documentos y el historial; su estado activo o inactivo no cambia por esta acción.</AlertDialogDescription></AlertDialogHeader>
        <form onSubmit={revoke} noValidate className="space-y-6">
          <div className="space-y-2"><Label htmlFor="consent-reason">Motivo o referencia de la comunicación</Label>
            <p id="consent-reason-help">Escribe el motivo comunicado por el acudiente. Máximo 2 000 caracteres; no incluyas datos personales adicionales.</p>
            <textarea ref={reasonInput} id="consent-reason" required maxLength={2000} rows={4} value={revokeAttempt?.reason ?? draft.revocation?.reason ?? ''}
              disabled={busy || Boolean(revokeAttempt)} aria-invalid={Boolean(errors.reason)} aria-describedby="consent-reason-help consent-reason-error"
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base leading-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-disabled"
              onChange={event => { if (draft.revocation) update({ ...currentDraft.current, revocation: { ...draft.revocation, reason: event.target.value } }); setErrors(old => ({ ...old, reason: '' })); }} />
            <p id="consent-reason-error" role="status">{errors.reason}</p></div>
          {!available && <p role="status">Espera la comprobación del estado antes de confirmar.</p>}
          <AlertDialogFooter><AlertDialogCancel ref={cancel} type="button" disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={busy || !available}>{busy ? 'Registrando revocación…' : revokeAttempt ? 'Reenviar la misma revocación' : 'Confirmar revocación'}</AlertDialogAction></AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
    <div className="mt-8 border-t border-border pt-6"><h3 className="text-lg font-semibold">Historial de documentos</h3>
      {historyState === 'loading' && <p role="status" className="mt-3">Consultando historial…</p>}
      {historyState === 'unavailable' && <div className="mt-3"><p>No pudimos actualizar el historial. Los registros guardados no se borraron por este problema.</p><Button variant="outline" className="mt-3" onClick={() => void history()}>Volver a consultar el historial</Button></div>}
      {historyState === 'ready' && !events.length && <p className="mt-3 text-sm text-muted">Todavía no hay documentos registrados.</p>}
      <ol className="mt-4 divide-y divide-border">{events.map(event => <li key={event.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div className="min-w-0 space-y-1"><p className="font-medium">{event.type === 'REGISTER' ? 'Registro inicial' : event.type === 'REPLACE' ? 'Nuevo documento' : 'Revocación'} · Registro {event.version}</p>
          <p className="text-sm [overflow-wrap:anywhere]">{event.author.name} · {new Date(event.occurredAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (Colombia)</p>
           <p className="text-sm text-muted">Firma: {event.record.signedOn} · Recepción: {event.record.receivedOn}</p>
           {event.reason && <p className="max-w-2xl whitespace-pre-wrap [overflow-wrap:anywhere]">Motivo: {event.reason}</p>}</div>
        <Button type="button" variant="outline" onClick={() => void download(event.record.id)} aria-label={`Descargar documento del registro ${event.version}`}><Download aria-hidden="true" className="size-4" />Descargar</Button>
      </li>)}</ol>
      {cursor && <Button variant="outline" disabled={historyState === 'loading'} onClick={() => void history(cursor)}>Ver registros anteriores</Button>}
    </div>
  </section>;
}
