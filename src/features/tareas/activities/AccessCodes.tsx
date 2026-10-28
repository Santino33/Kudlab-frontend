import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useMutation, useQuery } from '../../usuarios/hooks';
import { Loading } from '../../usuarios/shared';
import type { ActivitiesApi } from './api';
import { accessMessage, assignmentPath, executionPath, studentTasksPath, unavailableLabels, type Assignment, type CodeMetadata, type RevealedCode } from './types';
import { ActivityFailure, ActivityLink, operationId } from './Activities';
import { prepareCodes } from './prepare-codes';
const date = (v: string) => new Date(v).toLocaleString('es-CO', { timeZoneName: 'short' });

function useReveal(api: ActivitiesApi, title: string) {
  const [revealed, setRevealed] = useState<RevealedCode>(), [manual, setManual] = useState(''), [feedback, setFeedback] = useState(''), [busy, setBusy] = useState(false);
  const flight = useRef<AbortController | undefined>(undefined), epoch = useRef(0);
  function hide() { epoch.current++; flight.current?.abort(); flight.current = undefined; setRevealed(undefined); setManual(''); setFeedback(''); setBusy(false); }
  useEffect(() => {
    const clear = () => flushSync(hide), visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear); window.addEventListener('pagehide', clear); document.addEventListener('visibilitychange', visibility);
    return () => { epoch.current++; flight.current?.abort(); window.removeEventListener('blur', clear); window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  async function reveal(c: CodeMetadata, action: 'show' | 'code' | 'message') {
    hide(); const generation = epoch.current, abort = new AbortController(); flight.current = abort; setBusy(true);
    const timer = setTimeout(() => abort.abort(), 15000);
    try {
      const result = await api.revealCode(c.id, abort.signal);
      if (generation !== epoch.current || document.hidden) return;
      if (abort.signal.aborted) { setFeedback('No pudimos confirmar el revelado. Comprueba la conexión y reintenta.'); return; }
      if (result.kind !== 'success') { setFeedback('No pudimos revelar el código. Actualiza para comprobar acceso y vigencia.'); return; }
      const value = result.data; setRevealed(value);
      if (action === 'show') return;
      const text = action === 'code' ? value.code : accessMessage(value, title, import.meta.env.VITE_PLAY_ORIGIN ?? '');
      try { await navigator.clipboard.writeText(text); if (generation === epoch.current && !document.hidden) setFeedback('Copiado. Compártelo individualmente por el canal autorizado; no se ha enviado desde Kudlab.'); }
      catch { if (generation === epoch.current && !document.hidden) { setManual(text); setFeedback('No se pudo copiar. Selecciona el texto y cópialo manualmente.'); } }
    } catch { if (generation === epoch.current) setFeedback('No pudimos revelar el acceso. Comprueba la configuración y reintenta.'); }
    finally { clearTimeout(timer); if (generation === epoch.current) setBusy(false); }
  }
  return { revealed, manual, feedback, busy, hide, reveal };
}
type Reveal = ReturnType<typeof useReveal>;
function CodeControls({ api, c, name, actorId, reveal, reload }: { api: ActivitiesApi; c: CodeMetadata; name: string; actorId: string; reveal: Reveal; reload(): void }) {
  const mutation = useMutation<CodeMetadata>(), [confirm, setConfirm] = useState<'replace' | 'revoke'>(), [open, setOpen] = useState(false);
  async function mutate() {
    if (!confirm) return;
    reveal.hide(); const requestId = operationId(`access:${confirm}:${actorId}:${c.id}`);
    const result = await mutation.run(signal => confirm === 'replace' ? api.replaceCode(c.id, requestId, signal) : api.revokeCode(c.id, requestId, signal));
    if (result?.kind === 'success') { setOpen(false); reload(); }
  }
  const shown = reveal.revealed?.codeId === c.id;
  return <div className="staff-stack">
    <p>{c.status === 'ACTIVE' ? 'Vigente' : c.status === 'EXPIRED' ? 'Vencido' : c.status === 'REPLACED' ? 'Reemplazado' : 'Revocado'} · {c.scope === 'SUBMIT_ONLY' ? 'Solo envío' : 'Actividad'} · Hasta {date(c.expiresAt)}</p>
    {!c.canReveal && c.unavailableReasons.length > 0 && <p>No se puede revelar: {c.unavailableReasons.map(reason => unavailableLabels[reason] ?? 'acceso no utilizable').join('; ')}.</p>}
    <div className="staff-actions">
      {c.canReveal && <><Button variant="outline" disabled={reveal.busy} onClick={() => void reveal.reveal(c, 'show')}>Mostrar código</Button><Button variant="outline" disabled={reveal.busy} onClick={() => void reveal.reveal(c, 'code')}>Copiar código</Button><Button variant="outline" disabled={reveal.busy} onClick={() => void reveal.reveal(c, 'message')}>Copiar mensaje</Button></>}
      {c.status === 'ACTIVE' && <><Button variant="outline" onClick={() => { setConfirm('replace'); setOpen(true); }}>Reemplazar</Button><Button variant="outline" onClick={() => { setConfirm('revoke'); setOpen(true); }}>Revocar</Button></>}
    </div>
    {shown && <div className="staff-stack"><p>Código para {name}: <strong className="text-xl">{reveal.revealed!.code}</strong></p>{reveal.manual && <div className="auth-field"><Label htmlFor={`manual-${c.id}`}>Texto para copia manual de {name}</Label><textarea id={`manual-${c.id}`} className="access-copy-text" value={reveal.manual} readOnly onFocus={e => e.currentTarget.select()} /></div>}<Button variant="outline" className="w-fit" onClick={reveal.hide}>Ocultar código</Button></div>}
    <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm === 'replace' ? '¿Reemplazar' : '¿Revocar'} el acceso de {name}?</AlertDialogTitle><AlertDialogDescription>El código anterior dejará de autorizar nuevas actividades. No se reinician intentos ni se borra evidencia de sesiones iniciadas. {c.scope === 'SUBMIT_ONLY' && 'Este código sirve solo para enviar un pendiente.'}</AlertDialogDescription></AlertDialogHeader>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button disabled={mutation.pending} onClick={() => void mutate()}>{mutation.pending ? 'Confirmando…' : confirm === 'replace' ? 'Reemplazar acceso' : 'Revocar acceso'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
export function AssignmentAccess({ api, assignment, groupId, actorId }: { api: ActivitiesApi; assignment: Assignment; groupId: string; actorId: string }) {
  const query = useQuery(async signal => {
    const items: CodeMetadata[] = [], visited = new Set<string>(); let cursor: string | undefined;
    do {
      const result = await api.codes(assignment.id, signal, cursor);
      if (result.kind !== 'success') return result;
      items.push(...result.data.items); cursor = result.data.nextCursor ?? undefined;
      if (cursor && visited.has(cursor)) return { kind: 'unavailable' as const, uncertain: false };
      if (cursor) visited.add(cursor);
    } while (cursor);
    return { kind: 'success' as const, data: items };
  }, assignment.id);
  const [page, setPage] = useState(0), [show, setShow] = useState(true), [values, setValues] = useState<Record<string, string>>({}), [failed, setFailed] = useState(false), [projecting, setProjecting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), flight = useRef<AbortController | undefined>(undefined);
  const reveal = useReveal(api, assignment.title), mutation = useMutation<Assignment>();
  const preparation = useRef<string[] | undefined>(undefined);
  const codes = query.result?.kind === 'success' ? query.result.data : undefined;
  const people = assignment.recipients.slice(page * 30, (page + 1) * 30);
  const current = (recipientId: string) => codes?.find(c => c.recipientId === recipientId && c.scope === 'PLAY_AND_SUBMIT' && c.status === 'ACTIVE');
  function hide() { flight.current?.abort(); setValues({}); setShow(false); setProjecting(false); }
  function refresh() { hide(); reveal.hide(); query.reload(); }
  useEffect(() => {
    const clear = () => flushSync(hide), visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear); window.addEventListener('pagehide', clear); document.addEventListener('visibilitychange', visibility);
    return () => { flight.current?.abort(); window.removeEventListener('blur', clear); window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!show || !codes) return;
    const abort = new AbortController(); flight.current = abort; const timer = setTimeout(() => { abort.abort(); setFailed(true); }, 15000);
    setFailed(false);
    const selected = assignment.recipients.slice(page * 30, (page + 1) * 30).map(r => codes.find(c => c.recipientId === r.id && c.scope === 'PLAY_AND_SUBMIT' && c.status === 'ACTIVE' && c.canReveal)).filter(c => c !== undefined);
    let next = 0;
    void Promise.all(Array.from({ length: Math.min(5, selected.length) }, async () => {
      while (!abort.signal.aborted && next < selected.length) {
        const c = selected[next++]!, result = await api.revealCode(c.id, abort.signal);
        if (abort.signal.aborted || document.hidden) return;
        if (result.kind === 'success') setValues(old => ({ ...old, [c.id]: result.data.code }));
        else setFailed(true);
      }
    })).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); abort.abort(); };
  }, [api, assignment.recipients, codes, page, show]);
  useEffect(() => { if (projecting) dialog.current?.showModal(); else dialog.current?.close(); }, [projecting]);
  async function generate() {
    hide(); reveal.hide();
    preparation.current ??= Array.from({ length: Math.ceil(assignment.recipients.length / 100) }, () => crypto.randomUUID());
    const result = await mutation.run(signal => prepareCodes(api, assignment, batch => preparation.current![batch]!, signal));
    if (result?.kind === 'success') { preparation.current = undefined; query.reload(); setShow(true); }
  }
  function changePage(value: number) { flight.current?.abort(); setValues({}); reveal.hide(); setPage(value); setShow(true); }
  const codeText = (r: Assignment['recipients'][number]) => {
    const c = current(r.id);
    return c && c.canReveal ? values[c.id] ?? (show ? 'Comprobando…' : 'Oculto') : 'No disponible';
  };
  const paging = <div className="staff-actions"><Button variant="outline" disabled={page === 0} onClick={() => changePage(page - 1)}>Página anterior</Button><p>{page * 30 + 1}–{Math.min((page + 1) * 30, assignment.recipients.length)} de {assignment.recipients.length}</p><Button variant="outline" disabled={(page + 1) * 30 >= assignment.recipients.length} onClick={() => changePage(page + 1)}>Página siguiente</Button></div>;
  return <section className="staff-stack" aria-labelledby="access-title"><h2 id="access-title" className="staff-section-title">Códigos de actividad</h2>
    <div className="staff-actions"><Button disabled={!codes || !show || !Object.keys(values).length} onClick={() => setProjecting(true)}>Proyectar códigos</Button><Button variant="outline" onClick={() => { hide(); reveal.hide(); if (!show) { setShow(true); query.reload(); } }}>{show ? 'Ocultar códigos' : 'Mostrar códigos'}</Button><Button variant="outline" onClick={refresh}>Actualizar accesos</Button></div>
    <p>La proyección permite ver códigos de compañeros: supervisa que cada estudiante use el suyo. El código no comprueba identidad.</p>
    {!query.result ? <Loading text="Consultando accesos" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={refresh} /> : <>
      {assignment.status === 'OPEN' && assignment.recipients.some(r => !current(r.id)) && <Button className="w-fit" variant="outline" disabled={mutation.pending} onClick={() => void generate()}>{mutation.pending ? 'Preparando códigos…' : 'Preparar códigos disponibles'}</Button>}
      <ul className="classroom-roster">{people.map(r => { const c = current(r.id); return <li key={r.id} className="access-code-row"><div className="classroom-identity"><div><h3 className="font-semibold">{r.studentDisplayName}</h3><p>{r.studentCode} · {r.attemptsStarted} de {assignment.maxAttempts} intentos</p></div><strong className="classroom-code">{codeText(r)}</strong></div>
        {!c?.canReveal && <p>{r.unavailableReasons.map(reason => unavailableLabels[reason]).join('; ') || 'Sin código de actividad vigente. Consulta la gestión de acceso.'}</p>}
        <details><summary>Gestionar acceso y sesiones</summary><div className="staff-stack mt-4"><div className="staff-actions"><ActivityLink href={studentTasksPath(groupId, r.studentId)}>Ver sesiones</ActivityLink>{r.canLaunch && <ActivityLink href={executionPath(`${assignmentPath(groupId, assignment.id)}/destinatarios/${r.id}/ejecucion`)}>Iniciar actividad supervisada</ActivityLink>}</div>{c && <CodeControls api={api} c={c} name={r.studentDisplayName} actorId={actorId} reveal={{ ...reveal, hide: () => { hide(); reveal.hide(); } }} reload={refresh} />}<details><summary>Historial de códigos</summary><ul>{codes?.filter(code => code.recipientId === r.id).map(code => <li key={code.id}>{code.scope === 'SUBMIT_ONLY' ? 'Solo envío' : 'Actividad'} · {code.status === 'ACTIVE' ? 'Vigente' : code.status === 'REPLACED' ? 'Reemplazado' : code.status === 'REVOKED' ? 'Revocado' : 'Vencido'} · Hasta {date(code.expiresAt)}</li>)}</ul></details></div></details>
      </li>; })}</ul>
      {assignment.recipients.length > 30 && paging}
    </>}
    {failed && <p role="status">Algunos códigos no pudieron comprobarse. Vuelve a mostrar los códigos para reintentar.</p>}
    {mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} retry={() => void generate()} />}
    <p role="status">{reveal.feedback}</p>
    <dialog ref={dialog} className="access-projector" aria-labelledby="projector-title" onCancel={() => setProjecting(false)} onClose={() => setProjecting(false)}><div className="staff-stack"><header className="staff-heading"><div><h2 id="projector-title" className="staff-section-title">{assignment.title}</h2><p>Abre {import.meta.env.VITE_PLAY_ORIGIN} e ingresa tu código.</p></div><Button variant="outline" onClick={() => setProjecting(false)}>Cerrar proyección</Button></header><ul className="projector-roster">{people.map(r => <li key={r.id}><span>{r.studentDisplayName}</span><strong className="classroom-code">{codeText(r)}</strong></li>)}</ul>{assignment.recipients.length > 30 && paging}</div></dialog>
  </section>;
}
export function RecoveryAccess({ api, sessionId, actorId }: { api: ActivitiesApi; sessionId: string; actorId: string }) {
  const mutation = useMutation<CodeMetadata>(), reveal = useReveal(api, 'Lluvia de estrellas'), [open, setOpen] = useState(false);
  const requestId = useRef<string | undefined>(undefined);
  async function generate() { requestId.current ??= crypto.randomUUID(); const result = await mutation.run(signal => api.recoveryCode(sessionId, requestId.current!, signal)); if (result?.kind === 'success') { setOpen(false); requestId.current = undefined; } }
  return <section className="staff-stack mt-4"><h2 className="staff-section-title">Resultados aún no recibidos</h2><p>Solo si el navegador original conserva resultados que todavía no llegaron al servidor y su autorización de envío venció. No permite volver a jugar ni mueve el respaldo entre perfiles.</p><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger render={<Button variant="outline" className="w-fit" />}>Generar código de recuperación</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Autorizar solo el envío pendiente</AlertDialogTitle><AlertDialogDescription>Vigencia de 24 horas. Se usará en /pendientes del mismo sitio y perfil de Play que conserva la evidencia. No inicia otra actividad ni consume un intento.</AlertDialogDescription></AlertDialogHeader>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button disabled={mutation.pending} onClick={() => void generate()}>{mutation.pending ? 'Confirmando…' : 'Confirmar código de recuperación'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>{mutation.result?.kind === 'success' && <CodeControls api={api} c={mutation.result.data} name="esta sesión" actorId={actorId} reveal={reveal} reload={() => { mutation.clear(); reveal.hide(); }} />}<p role="status">{reveal.feedback}</p></section>;
}
