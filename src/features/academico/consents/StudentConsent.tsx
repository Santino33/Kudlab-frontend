import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConsentsApi } from './api.ts';
import type { ConsentDraft, ConsentEvent, ConsentSnapshot } from './types.ts';
import { fieldMessages } from './types.ts';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<ConsentEvent[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const requests = useRef(new Set<AbortController>()), urls = useRef(new Set<string>()), alive = useRef(true);
  const summary = useRef<HTMLParagraphElement>(null), input = useRef<HTMLInputElement>(null);
  const historySequence = useRef(0);
  const historyDenied = useRef(false);
  const authorized = () => alive.current && lease.valid();
  function update(value: ConsentDraft) { if (authorized()) { currentDraft.current = value; slot.write(value); setDraft(value); } }
  function controller() { const value = new AbortController(); requests.current.add(value); return value; }
  useEffect(() => {
    alive.current = true;
    const stop = () => {
      alive.current = false;
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
  function confirmed(requestId: string) {
    handle.clear(); setPendingId(undefined); update({ signedOn: '', receivedOn: '' });
    if (input.current) input.current.value = '';
    setMessage('Consentimiento registrado.');
    onChange({ studentId, requestId, outcome: 'confirmed' });
  }
  async function reconcile() {
    if (!pendingId || busy || !authorized()) return;
    setBusy(true); const request = controller();
    const result = await api.operation(studentId, pendingId, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    setBusy(false);
    if (result.kind === 'success') {
      if (result.data.status === 'COMMITTED') { confirmed(pendingId); return; }
      if (result.data.status === 'REJECTED') {
        handle.clear(); setPendingId(undefined); update({ ...currentDraft.current, operation: undefined, phase: undefined });
        setMessage('El intento no se confirmó porque cambió la versión. Revisa el estado actual antes de guardar de nuevo.'); recheck(); return;
      }
      const a = result.data.attempt;
      update({ ...currentDraft.current, signedOn: a.signedOn!, receivedOn: a.receivedOn!, phase: 'retry',
        operation: { requestId: pendingId, expectedVersion: a.expectedVersion, signedOn: a.signedOn!, receivedOn: a.receivedOn! } });
      setMessage('El intento sigue pendiente. Puedes reenviar exactamente el mismo documento y las mismas fechas; conservaremos su identificador.');
    } else {
      setMessage('El resultado sigue sin confirmar. Conservamos el identificador; una consulta fallida o sin resultado no demuestra que se haya deshecho.');
      if (result.kind === 'error' && result.status === 404) {
        if (currentDraft.current.operation) update({ ...currentDraft.current, phase: 'retry' });
        recheck();
      }
    }
  }
  useEffect(() => { if (pendingId) void reconcile(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || currentDraft.current.phase === 'sending' || !authorized() || !snapshot || refresh.status !== 'ready' || pendingId && draft.phase !== 'retry') return;
    const issues: Record<string, string> = {};
    if (!draft.file) issues.file = 'Selecciona un documento.';
    else if (draft.file.size > 10485760 || !draft.file.size) issues.file = 'El documento debe contener datos y no superar 10 MiB.';
    if (!draft.signedOn) issues.signedOn = 'Indica la fecha de firma.';
    if (!draft.receivedOn) issues.receivedOn = 'Indica la fecha de recepción.';
    if (draft.signedOn > draft.receivedOn) issues.signedOn = fieldMessages.date_order;
    setErrors(issues);
    if (Object.keys(issues).length) { setMessage('Revisa los campos indicados.'); requestAnimationFrame(() => summary.current?.focus()); return; }
    const metadata = draft.operation ?? { requestId: crypto.randomUUID(), expectedVersion: snapshot.consent.version, signedOn: draft.signedOn, receivedOn: draft.receivedOn };
    update({ ...draft, operation: metadata, phase: 'sending' }); setPendingId(metadata.requestId);
    handle.write({ actorId, studentId, requestId: metadata.requestId }); setBusy(true); setMessage('Comprobando y guardando el documento…');
    const request = controller(), result = await api.register(studentId, metadata, draft.file!, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    setBusy(false);
    if (result.kind === 'success') { confirmed(metadata.requestId); return; }
    const conflict = result.kind === 'error' && result.fields?.find(field => field.field === 'operation')?.reason;
    if (result.kind === 'obsolete' || 'uncertain' in result && result.uncertain || result.kind === 'unavailable' || conflict === 'REQUEST_REUSED' || conflict === 'EVIDENCE_MISMATCH') {
      update({ ...currentDraft.current, phase: 'uncertain' });
      setMessage('No pudimos confirmar el guardado. Comprueba este intento antes de volver a enviarlo.');
      onChange({ studentId, requestId: metadata.requestId, outcome: 'uncertain' });
    } else {
      handle.clear(); setPendingId(undefined); update({ ...currentDraft.current, operation: undefined, phase: undefined });
      if (result.kind === 'error') setErrors(Object.fromEntries((result.fields ?? []).map(field => [field.field, fieldMessages[field.reason]])));
      setMessage(conflict ? fieldMessages[conflict] : 'No se guardó el documento. Revisa los campos y el formato del archivo.');
      if (result.kind === 'error' && [404, 409].includes(result.status)) recheck();
    }
    requestAnimationFrame(() => { if (authorized()) summary.current?.focus(); });
  }
  async function download(recordId: string) {
    const request = controller(), result = await api.document(studentId, recordId, request.signal); requests.current.delete(request);
    if (!authorized()) return;
    if (result.kind !== 'success') { setMessage('No se pudo descargar el documento. Su estado no ha cambiado.'); if (result.kind === 'error' && result.status === 404) recheck(); return; }
    const url = URL.createObjectURL(result.data); urls.current.add(url);
    const link = document.createElement('a'); link.href = url;
    link.download = `consentimiento-${recordId}.${result.data.type === 'application/pdf' ? 'pdf' : result.data.type === 'image/png' ? 'png' : 'jpg'}`;
    link.click(); setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
  }
  const frozen = busy || Boolean(pendingId), available = Boolean(snapshot) && refresh.status === 'ready';
  return <section className="rounded-xl border border-border bg-white p-5 sm:p-8" aria-labelledby="consent-title">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="consent-title" className="text-xl font-semibold">Consentimiento informado</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">Documento del representante y trazabilidad de cada registro. El estado académico se muestra por separado.</p></div>
      <span className="account-status">{refresh.status === 'checking' ? 'Comprobando…' : !available ? 'No se pudo comprobar' : snapshot!.consent.state === 'NONE' ? 'Sin registro' : snapshot!.consent.state === 'CURRENT' ? 'Vigente' : 'Revocado'}</span>
    </header>
    <Button className="mt-4" variant="outline" disabled={refresh.status === 'checking'} onClick={recheck}>Actualizar estado</Button>
    {!available && <p className="mt-5">Las acciones de registro esperan una comprobación actual. Tu borrador se conserva mientras mantengas acceso.</p>}
    <p ref={summary} tabIndex={-1} role="status" className="mt-5 text-sm empty:hidden">{message}</p>
    {pendingId && <div className="mt-4 rounded-lg border border-border p-4"><h3 className="font-semibold">Hay un intento por comprobar</h3><p className="mt-1 text-sm">No crearemos otra operación mientras su resultado sea incierto. Si recargaste, deberás seleccionar otra vez el archivo original.</p><Button className="mt-3" variant="outline" disabled={busy} onClick={() => void reconcile()}>Comprobar intento</Button></div>}
    <form onSubmit={submit} className="mt-6 max-w-2xl space-y-5" onFocusCapture={event => { if (event.target.id) update({ ...currentDraft.current, focus: event.target.id }); }}>
      <div className="space-y-2"><Label htmlFor="consent-file">Documento firmado</Label>
        <p id="consent-file-help" className="text-sm text-muted">PDF sin contraseña (hasta 200 páginas), PNG o JPEG estático (hasta 40 millones de píxeles). Máximo 10 MiB. Se conserva el archivo original. Si el selector se cerró al comprobar tu acceso, vuelve a seleccionar el archivo.</p>
        <Input ref={input} id="consent-file" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy || Boolean(pendingId && draft.phase !== 'retry')} aria-invalid={Boolean(errors.file)} aria-describedby="consent-file-help consent-file-error" onChange={event => {
          const file = event.target.files?.[0]; if (!file || !authorized()) return;
          if (file.size > 10485760 || !file.size) { setErrors(old => ({ ...old, file: 'Selecciona un archivo de hasta 10 MiB y no vacío.' })); event.target.value = ''; return; }
          update({ ...currentDraft.current, file }); setErrors(old => ({ ...old, file: '' }));
        }} />
        {draft.file && <div className="flex flex-wrap items-center gap-3 text-sm"><FileText aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">Archivo retenido: {draft.file.name} · {(draft.file.size / 1024).toFixed(1)} KiB</span><Button type="button" variant="outline" disabled={frozen} onClick={() => { update({ ...draft, file: undefined }); if (input.current) input.current.value = ''; }}>Quitar</Button></div>}
        <p id="consent-file-error" className="text-sm">{errors.file}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{(['signedOn', 'receivedOn'] as const).map(field => <div key={field} className="space-y-2"><Label htmlFor={`consent-${field}`}>{field === 'signedOn' ? 'Fecha de firma' : 'Fecha de recepción'}</Label>
        <Input id={`consent-${field}`} type="date" value={draft[field]} disabled={frozen} aria-invalid={Boolean(errors[field])} aria-describedby={`consent-${field}-error consent-date-help`} onChange={event => update({ ...draft, [field]: event.target.value })} />
        <p id={`consent-${field}-error`} className="text-sm">{errors[field]}</p></div>)}</div>
      <p id="consent-date-help" className="text-sm text-muted">Fechas en Colombia (America/Bogota), no futuras. La firma debe ser anterior o igual a la recepción.</p>
      {errors.operation && <p>{errors.operation}</p>}
      <Button type="submit" disabled={busy || !available || Boolean(pendingId && draft.phase !== 'retry')}>{busy ? 'Comprobando documento…' : pendingId ? 'Reenviar el mismo intento' : !snapshot || snapshot.consent.state === 'NONE' ? 'Registrar consentimiento' : 'Registrar nuevo documento'}</Button>
      <p className="text-sm text-muted">Un registro confirmado activa al estudiante. Los documentos anteriores permanecen en el historial.</p>
    </form>
    <div className="mt-8 border-t border-border pt-6"><h3 className="text-lg font-semibold">Historial de documentos</h3>
      {historyState === 'loading' && <p role="status" className="mt-3">Consultando historial…</p>}
      {historyState === 'unavailable' && <div className="mt-3"><p>El historial no está actualizado. No significa que no existan registros.</p><Button variant="outline" className="mt-3" onClick={() => void history()}>Reintentar historial</Button></div>}
      {historyState === 'ready' && !events.length && <p className="mt-3 text-sm text-muted">Todavía no hay documentos registrados.</p>}
      <ol className="mt-4 divide-y divide-border">{events.map(event => <li key={event.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div className="min-w-0 space-y-1"><p className="font-medium">{event.type === 'REGISTER' ? 'Registro inicial' : event.type === 'REPLACE' ? 'Nuevo documento' : 'Revocación'} · Versión {event.version}</p>
          <p className="text-sm [overflow-wrap:anywhere]">{event.author.name} · {new Date(event.occurredAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (Colombia)</p>
          <p className="text-sm text-muted">Firma: {event.record.signedOn} · Recepción: {event.record.receivedOn}</p></div>
        <Button type="button" variant="outline" onClick={() => void download(event.record.id)} aria-label={`Descargar documento de la versión ${event.version}`}><Download aria-hidden="true" className="size-4" />Descargar</Button>
      </li>)}</ol>
      {cursor && <Button variant="outline" disabled={historyState === 'loading'} onClick={() => void history(cursor)}>Ver registros anteriores</Button>}
    </div>
  </section>;
}
