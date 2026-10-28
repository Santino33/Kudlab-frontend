import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useMutation, useQuery } from '../../usuarios/hooks';
import { Loading } from '../../usuarios/shared';
import type { ActivitiesApi } from './api';
import { accessMessage, unavailableLabels, type Assignment, type CodeMetadata, type RevealedCode } from './types';
import { ActivityFailure, operationId } from './Activities';
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
export function AssignmentAccess({ api, assignment, groupName, actorId }: { api: ActivitiesApi; assignment: Assignment; groupName: string; actorId: string }) {
  const [cursor, setCursor] = useState<string>(), [selected, setSelected] = useState<string[]>([]), [open, setOpen] = useState(false);
  const query = useQuery(signal => api.codes(assignment.id, signal, cursor), `${assignment.id}:${cursor ?? ''}`), reveal = useReveal(api, assignment.title);
  const mutation = useMutation<{ items: CodeMetadata[]; createdCount: number; reusedCount: number }>();
  const [frozen, setFrozen] = useState<{ requestId: string; recipientIds: string[] }>();
  const codes = query.result?.kind === 'success' ? query.result.data.items : [];
  const eligible = assignment.recipients.filter(r => assignment.status === 'OPEN' && r.unavailableReasons.every(reason => reason === 'OUTSIDE_WINDOW' && assignment.availability === 'FUTURE'));
  async function generate() {
    const input = frozen ?? { requestId: crypto.randomUUID(), recipientIds: [...selected] }; setFrozen(input);
    const result = await mutation.run(signal => api.generateCodes(assignment.id, input.requestId, input.recipientIds, signal));
    if (result?.kind === 'success') { setFrozen(undefined); setOpen(false); setSelected([]); reveal.hide(); setCursor(undefined); query.reload(); }
    else if (result?.kind === 'error' && [400, 403, 404, 409].includes(result.status)) setFrozen(undefined);
  }
  return <section className="staff-stack" aria-labelledby="access-title"><h2 id="access-title" className="staff-section-title">Accesos por código</h2><p>{assignment.title} · {groupName}. Selecciona hasta 100 destinatarios. Se reutiliza el código vigente; copiar no significa enviar ni recibir.</p>
    <fieldset className="staff-stack" disabled={mutation.pending || Boolean(frozen)}><legend className="font-semibold">Destinatarios para generar acceso</legend>{eligible.map(r => <label className="activity-choice" key={r.id}><input type="checkbox" checked={selected.includes(r.id)} onChange={e => setSelected(old => e.target.checked ? [...old, r.id] : old.filter(id => id !== r.id))} /><span>{r.studentDisplayName} · {r.studentCode}</span></label>)}{!eligible.length && <p>No hay destinatarios disponibles para generar códigos nuevos. El servidor revalidará participación, disponibilidad e intentos.</p>}<p>{assignment.recipients.length - eligible.length} excluidos por disponibilidad, participación o intentos; consulta sus motivos en la asignación.</p></fieldset>
    <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger render={<Button className="w-fit" disabled={!frozen && (!selected.length || selected.length > 100)} />}>Generar accesos</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar destinatarios</AlertDialogTitle><AlertDialogDescription>{assignment.title} · {groupName}. Hasta 7 días desde emisión, sin superar {date(assignment.endsAt)}. Un código acredita posesión, no identidad física.</AlertDialogDescription></AlertDialogHeader><ul>{assignment.recipients.filter(r => (frozen?.recipientIds ?? selected).includes(r.id)).map(r => <li key={r.id}>{r.studentDisplayName} · {r.studentCode}</li>)}</ul>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button onClick={() => void generate()} disabled={mutation.pending}>{mutation.pending ? 'Generando…' : frozen ? 'Comprobar misma solicitud' : 'Confirmar generación'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {mutation.result?.kind === 'success' && <p role="status">Accesos confirmados: {mutation.result.data.createdCount} nuevos y {mutation.result.data.reusedCount} reutilizados.</p>}
    {!query.result ? <Loading text="Consultando accesos" /> : query.result.kind !== 'success' ? <ActivityFailure result={query.result} retry={query.reload} /> : !codes.length ? <p>No hay códigos en esta página.</p> : <ul className="staff-stack">{codes.map(c => { const r = assignment.recipients.find(r => r.id === c.recipientId); return r ? <li key={c.id} className="access-code-row"><h3 className="font-semibold">{r.studentDisplayName} · {r.studentCode}</h3><CodeControls {...{ api, c, actorId, reveal }} name={r.studentDisplayName} reload={query.reload} /></li> : null; })}</ul>}
    <p role="status">{reveal.feedback}</p><div className="staff-actions"><Button variant="outline" onClick={() => { reveal.hide(); query.reload(); }}>Actualizar accesos</Button>{query.result?.kind === 'success' && query.result.data.nextCursor && <Button variant="outline" onClick={() => { reveal.hide(); if (query.result?.kind === 'success') setCursor(query.result.data.nextCursor ?? undefined); }}>Página siguiente</Button>}{cursor && <Button variant="outline" onClick={() => { reveal.hide(); setCursor(undefined); }}>Primera página</Button>}</div>
    <p>Comparte cada código individualmente. Si se divulga o se entrega a otra persona, reemplázalo. No proyectes la lista del curso.</p>
  </section>;
}
export function RecoveryAccess({ api, sessionId, actorId, hasReceipt }: { api: ActivitiesApi; sessionId: string; actorId: string; hasReceipt: boolean }) {
  const mutation = useMutation<CodeMetadata>(), reveal = useReveal(api, 'Lluvia de estrellas'), [open, setOpen] = useState(false);
  const requestId = useRef<string | undefined>(undefined);
  async function generate() { requestId.current ??= crypto.randomUUID(); const result = await mutation.run(signal => api.recoveryCode(sessionId, requestId.current!, hasReceipt, signal)); if (result?.kind === 'success') { setOpen(false); requestId.current = undefined; } }
  return <section className="staff-stack"><h2 className="staff-section-title">Envío desde Kudlab Play</h2><p>{hasReceipt ? 'El servidor ya tiene resultados. Genera un acceso solo si el navegador original aún conserva un pendiente sin acuse.' : 'Autoriza el envío del pendiente que conserva el navegador original de Play.'} No permite volver a jugar ni mueve el respaldo entre perfiles o desde el iframe.</p><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger render={<Button variant="outline" className="w-fit" />}>{hasReceipt ? 'Generar código para reconciliar acuse' : 'Generar código de recuperación'}</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Autorizar solo el envío pendiente</AlertDialogTitle><AlertDialogDescription>Vigencia de 24 horas. Se usará en /pendientes del mismo sitio y perfil de Play que conserva la evidencia. No inicia otra actividad ni consume un intento.</AlertDialogDescription></AlertDialogHeader>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button disabled={mutation.pending} onClick={() => void generate()}>{mutation.pending ? 'Confirmando…' : 'Confirmar código de recuperación'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>{mutation.result?.kind === 'success' && <CodeControls api={api} c={mutation.result.data} name="esta sesión" actorId={actorId} reveal={reveal} reload={() => { mutation.clear(); reveal.hide(); }} />}<p role="status">{reveal.feedback}</p></section>;
}
