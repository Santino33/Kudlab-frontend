import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation, useQuery } from '../../usuarios/hooks';
import type { ActivitiesApi } from './api';
import { accessMessage, assignmentPath, executionPath, studentTasksPath, unavailableLabels, type Assignment, type CodeMetadata, type RevealedCode } from './types';
import { ActivityFailure, ActivityLink, operationId } from './Activities';
import { useCodePreparation } from './use-code-preparation';
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
export function AssignmentAccess({ api, assignment, groupId, actorId, reloadAssignment }: { api: ActivitiesApi; assignment: Assignment; groupId: string; actorId: string; reloadAssignment(): void }) {
  const [issued, setIssued] = useState<CodeMetadata[]>([]);
  const preparation = useCodePreparation(api, assignment, actorId, items => setIssued(old => [...old.filter(c => !items.some(item => item.id === c.id)), ...items]));
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
  const [page, setPage] = useState(0), [show, setShow] = useState(!document.hidden), [values, setValues] = useState<Record<string, string>>({}), [failed, setFailed] = useState<string[]>([]), [projecting, setProjecting] = useState(false), [expanded, setExpanded] = useState<string>();
  const [revealAttempt, setRevealAttempt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null), flight = useRef<AbortController | undefined>(undefined);
  const reveal = useReveal(api, assignment.title), valueSnapshot = useRef(values); valueSnapshot.current = values;
  const codes = useMemo(() => [...new Map([...(query.result?.kind === 'success' ? query.result.data : []), ...issued].map(c => [c.id, c])).values()], [query.result, issued]);
  const people = assignment.recipients.slice(page * 30, (page + 1) * 30);
  const current = (recipientId: string) => codes.find(c => c.recipientId === recipientId && c.scope === 'PLAY_AND_SUBMIT' && c.status === 'ACTIVE' && Date.parse(c.expiresAt) > Date.now());
  function hide() { flight.current?.abort(); setValues({}); setFailed([]); setShow(false); setProjecting(false); }
  function refresh() { hide(); reveal.hide(); setIssued([]); query.reload(); }
  useEffect(() => {
    const clear = () => flushSync(hide), visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear); window.addEventListener('pagehide', clear); document.addEventListener('visibilitychange', visibility);
    return () => { flight.current?.abort(); window.removeEventListener('blur', clear); window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!show) return;
    const abort = new AbortController(); flight.current = abort;
    setFailed([]);
    const selected = assignment.recipients.slice(page * 30, (page + 1) * 30).map(r => current(r.id)).filter(c => c?.canReveal && !valueSnapshot.current[c.id]);
    let next = 0;
    void Promise.all(Array.from({ length: Math.min(5, selected.length) }, async () => {
      while (!abort.signal.aborted && next < selected.length) {
        const c = selected[next++]!, request = new AbortController(), cancel = () => request.abort();
        abort.signal.addEventListener('abort', cancel, { once: true });
        const timer = setTimeout(cancel, 15000);
        try {
          const result = await api.revealCode(c.id, request.signal);
          if (abort.signal.aborted || document.hidden) return;
          if (!request.signal.aborted && result.kind === 'success' && Date.parse(result.data.expiresAt) > Date.now()) setValues(old => ({ ...old, [c.id]: result.data.code }));
          else setFailed(old => [...old, c.id]);
        } catch { if (!abort.signal.aborted) setFailed(old => [...old, c.id]); }
        finally { clearTimeout(timer); abort.signal.removeEventListener('abort', cancel); }
      }
    }));
    return () => abort.abort();
  }, [api, assignment.recipients, codes, page, show, revealAttempt]);
  useEffect(() => {
    const nextExpiry = Math.min(...codes.filter(c => c.status === 'ACTIVE').map(c => Date.parse(c.expiresAt)).filter(at => at > Date.now()));
    if (!Number.isFinite(nextExpiry)) return;
    const timer = setTimeout(refresh, Math.min(nextExpiry - Date.now(), 2147483647));
    return () => clearTimeout(timer);
  }, [codes]);
  useEffect(() => { if (projecting) dialog.current?.showModal(); else dialog.current?.close(); }, [projecting]);
  function changePage(value: number) { flight.current?.abort(); setValues({}); reveal.hide(); setPage(value); setShow(true); }
  const codeText = (r: Assignment['recipients'][number]) => {
    const c = current(r.id);
    if (c?.canReveal) return !show ? 'Oculto' : values[c.id] ?? (failed.includes(c.id) ? 'No se pudo mostrar' : 'Mostrando…');
    if (!c && preparation.operation?.recipientIds.includes(r.id)) return preparation.pending ? 'Preparando…' : 'Preparación pendiente';
    return !query.result && !c ? 'Consultando…' : 'No disponible';
  };
  const missing = assignment.recipients.filter(r => !current(r.id) && r.unavailableReasons.every(reason => reason === 'OUTSIDE_WINDOW' && assignment.availability === 'FUTURE')).map(r => r.id);
  const ready = assignment.recipients.filter(r => current(r.id)?.canReveal).length;
  const paging = <div className="staff-actions"><Button variant="outline" disabled={page === 0} onClick={() => changePage(page - 1)}>Página anterior</Button><p>{page * 30 + 1}–{Math.min((page + 1) * 30, assignment.recipients.length)} de {assignment.recipients.length}</p><Button variant="outline" disabled={(page + 1) * 30 >= assignment.recipients.length} onClick={() => changePage(page + 1)}>Página siguiente</Button></div>;
  return <section className="staff-stack assignment-access" aria-labelledby="access-title">
    <header className="assignment-access-heading"><div><h2 id="access-title" className="staff-section-title">Estudiantes y códigos</h2><p role="status" aria-live="polite">{preparation.pending ? `Asignación creada. Preparando códigos: ${preparation.completed} de ${preparation.operation?.recipientIds.length ?? assignment.recipientCount}.` : preparation.operation ? `Preparación incompleta: ${preparation.completed} de ${preparation.operation.recipientIds.length} confirmados.` : !query.result && !issued.length ? 'Consultando códigos…' : query.result && query.result.kind !== 'success' ? 'No pudimos confirmar todos los códigos.' : `${ready} de ${assignment.recipientCount} códigos disponibles.`}</p></div>
      <div className="assignment-tools"><Button disabled={!show || !Object.keys(values).length} onClick={() => setProjecting(true)}>Proyectar códigos</Button><Button variant="outline" aria-label={show ? 'Ocultar códigos' : 'Mostrar códigos'} onClick={() => { hide(); reveal.hide(); if (!show) setShow(true); }}>{show ? 'Ocultar' : 'Mostrar'}</Button></div>
    </header>
    {preparation.storageError && <p role="alert">No pudimos conservar el progreso. Comprueba el almacenamiento de este sitio antes de continuar; no crearemos otra asignación.</p>}
    {preparation.operation && !preparation.pending && <div className="assignment-preparation"><p>La asignación se conserva. Reintenta los lotes pendientes con las mismas solicitudes, sin volver a seleccionar estudiantes.</p><Button variant="outline" onClick={preparation.retry}>Reintentar preparación pendiente</Button></div>}
    {preparation.result && preparation.result.kind !== 'success' && <ActivityFailure result={preparation.result} />}
    {query.result && query.result.kind !== 'success' && <ActivityFailure result={query.result} retry={refresh} />}
    <p className="assignment-hint">Proyección supervisada: cada estudiante debe usar su código.</p>
    <div className="classroom-roster"><Table className="classroom-table"><TableCaption className="sr-only">Códigos de actividad de {assignment.title}</TableCaption><TableHeader><TableRow><TableHead>Estudiante</TableHead><TableHead>Código de actividad</TableHead><TableHead>Intentos</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
      {people.map(r => { const c = current(r.id), text = codeText(r), isCode = Boolean(show && c?.canReveal && values[c.id]), open = expanded === r.id; return <Fragment key={r.id}>
        <TableRow className="access-code-row"><TableCell><span className="font-semibold">{r.studentDisplayName}</span><span className="student-reference">Referencia: {r.studentCode}</span></TableCell>
          <TableCell><strong className="classroom-code" data-state={isCode ? 'ready' : 'pending'}>{text}</strong>{c?.canReveal && <span className="code-expiry">Hasta {date(c.expiresAt)}</span>}
            {!c?.canReveal && <span className="code-reason">{[...new Set([...r.unavailableReasons, ...(c?.unavailableReasons ?? [])])].map(reason => unavailableLabels[reason] ?? 'Acceso no utilizable').join('; ') || (text === 'No disponible' ? 'Sin código de actividad vigente.' : '')}</span>}
            {!open && reveal.revealed?.codeId === c?.id && reveal.manual && <div className="auth-field"><Label htmlFor={`copy-${r.id}`}>Texto para copia manual de {r.studentDisplayName}</Label><textarea id={`copy-${r.id}`} className="access-copy-text" value={reveal.manual} readOnly onFocus={e => e.currentTarget.select()} /></div>}
          </TableCell><TableCell><span className="mobile-cell-label">Intentos: </span>{r.attemptsStarted} de {assignment.maxAttempts}</TableCell>
          <TableCell><div className="classroom-row-actions"><Button variant="outline" disabled={!c?.canReveal || reveal.busy} aria-label={`Copiar código de ${r.studentDisplayName}`} onClick={() => { if (c) void reveal.reveal(c, 'code'); }}>Copiar</Button><Button variant="outline" disabled={preparation.pending} aria-expanded={open} aria-controls={`manage-${r.id}`} aria-label={`Gestionar acceso de ${r.studentDisplayName}`} onClick={() => setExpanded(open ? undefined : r.id)}>{open ? 'Cerrar' : 'Más'}</Button></div></TableCell></TableRow>
        {open && <TableRow className="classroom-management"><TableCell colSpan={4}><div id={`manage-${r.id}`} className="staff-stack"><h3 className="font-semibold">Acceso de {r.studentDisplayName}</h3><div className="staff-actions"><ActivityLink href={studentTasksPath(groupId, r.studentId)}>Ver sesiones</ActivityLink>{r.canLaunch && <ActivityLink href={executionPath(`${assignmentPath(groupId, assignment.id)}/destinatarios/${r.id}/ejecucion`)}>Iniciar actividad supervisada</ActivityLink>}</div>
          {c && <CodeControls api={api} c={c} name={r.studentDisplayName} actorId={actorId} reveal={{ ...reveal, hide: () => { hide(); reveal.hide(); } }} reload={refresh} />}
          <details><summary>Historial de códigos</summary><ul>{codes.filter(code => code.recipientId === r.id).map(code => <li key={code.id}>{code.scope === 'SUBMIT_ONLY' ? 'Solo envío' : 'Actividad'} · {code.status === 'ACTIVE' ? 'Vigente' : code.status === 'REPLACED' ? 'Reemplazado' : code.status === 'REVOKED' ? 'Revocado' : 'Vencido'} · Hasta {date(code.expiresAt)}</li>)}</ul></details>
        </div></TableCell></TableRow>}
      </Fragment>; })}
    </TableBody></Table></div>
    {assignment.recipients.length > 30 && paging}
    {failed.length > 0 && <div className="assignment-preparation"><p role="status">No pudimos mostrar algunos códigos. Su generación no se repetirá.</p><Button variant="outline" onClick={() => { hide(); setShow(true); setRevealAttempt(old => old + 1); }}>Reintentar visualización</Button></div>}
    <p role="status">{reveal.feedback}</p>
    <details className="assignment-options"><summary>Más opciones de acceso</summary><div className="staff-actions"><Button variant="outline" disabled={preparation.pending} onClick={() => { refresh(); reloadAssignment(); }}>Actualizar asignación y códigos</Button>
      {assignment.status === 'OPEN' && query.result?.kind === 'success' && missing.length > 0 && !preparation.operation && <Button variant="outline" disabled={preparation.pending} onClick={() => { setExpanded(undefined); setShow(true); preparation.prepare(missing); }}>Preparar códigos disponibles</Button>}
    </div><p>Cada código tiene su propia caducidad: como máximo 7 días y sin superar el fin de la asignación. Preparar solo se usa para accesos que ya no tienen un código vigente; no reemplaza códigos activos ni reinicia intentos.</p></details>
    <dialog ref={dialog} className="access-projector" aria-labelledby="projector-title" onCancel={() => setProjecting(false)} onClose={() => setProjecting(false)}><div className="staff-stack"><header className="staff-heading"><div><h2 id="projector-title" className="staff-section-title">{assignment.title}</h2><p>Abre {import.meta.env.VITE_PLAY_ORIGIN} e ingresa tu código.</p></div><Button variant="outline" onClick={() => setProjecting(false)}>Cerrar proyección</Button></header><ul className="projector-roster">{people.map(r => <li key={r.id}><span>{r.studentDisplayName}</span><strong className="classroom-code" data-state={show && current(r.id) && values[current(r.id)!.id] ? 'ready' : 'pending'}>{codeText(r)}</strong></li>)}</ul>{assignment.recipients.length > 30 && paging}</div></dialog>
  </section>;
}
export function RecoveryAccess({ api, sessionId, actorId }: { api: ActivitiesApi; sessionId: string; actorId: string }) {
  const mutation = useMutation<CodeMetadata>(), reveal = useReveal(api, 'Lluvia de estrellas'), [open, setOpen] = useState(false);
  const requestId = useRef<string | undefined>(undefined);
  async function generate() { requestId.current ??= crypto.randomUUID(); const result = await mutation.run(signal => api.recoveryCode(sessionId, requestId.current!, signal)); if (result?.kind === 'success') { setOpen(false); requestId.current = undefined; } }
  return <section className="staff-stack mt-4"><h2 className="staff-section-title">Resultados aún no recibidos</h2><p>Solo si el navegador original conserva resultados que todavía no llegaron al servidor y su autorización de envío venció. No permite volver a jugar ni mueve el respaldo entre perfiles.</p><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger render={<Button variant="outline" className="w-fit" />}>Generar código de recuperación</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Autorizar solo el envío pendiente</AlertDialogTitle><AlertDialogDescription>Vigencia de 24 horas. Se usará en /pendientes del mismo sitio y perfil de Play que conserva la evidencia. No inicia otra actividad ni consume un intento.</AlertDialogDescription></AlertDialogHeader>{mutation.result && mutation.result.kind !== 'success' && <ActivityFailure result={mutation.result} />}<AlertDialogFooter><AlertDialogCancel disabled={mutation.pending}>Volver</AlertDialogCancel><Button disabled={mutation.pending} onClick={() => void generate()}>{mutation.pending ? 'Confirmando…' : 'Confirmar código de recuperación'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>{mutation.result?.kind === 'success' && <CodeControls api={api} c={mutation.result.data} name="esta sesión" actorId={actorId} reveal={reveal} reload={() => { mutation.clear(); reveal.hide(); }} />}<p role="status">{reveal.feedback}</p></section>;
}
