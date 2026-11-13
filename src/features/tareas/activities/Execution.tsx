import { useEffect, useRef, useState } from 'react';
import type { AuthController } from '../../../auth/controller.ts';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { ActivityHeading, ActivityLink, operationId } from './Activities';
import { studentTasksPath, type Grant } from './types.ts';
import { acceptsRuntimeMessage } from './bridge.ts';
import type { ActivitiesApi } from './api.ts';
import { validateApiOrigin } from '../../../lib/http.ts';
import { go } from '../../academico/groups/navigation.ts';

/** B-02: delivers results of an already started session saved in this browser context. Submit-only grant (canStart=false); never starts a game. */
export function SubmissionRecovery({ api, access, actorId, groupId, studentId, studentName, recoverySessionId, runtimeOrigin }: {
  api: ActivitiesApi; access: AuthController; actorId: string; groupId: string; studentId: string; studentName: string; recoverySessionId: string; runtimeOrigin: string;
}) {
  const publicId = (name: string) => { const value = new URLSearchParams(window.location.search).get(name); return value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value) ? value : undefined; };
  const frame = useRef<HTMLIFrameElement>(null), [bridgeId] = useState(() => publicId('bridgeId') ?? operationId(`bridge:${actorId}:${recoverySessionId}`));
  const [requestId] = useState(() => publicId('operationId') ?? operationId(`recover:${actorId}:${recoverySessionId}`));
  const [status, setStatus] = useState('Comprobando recursos y almacenamiento del juego…');
  const [retry, setRetry] = useState(0), [canRetry, setCanRetry] = useState(false), [sessionId, setSessionId] = useState<string>();
  let origin: string | undefined;
  try { const validated = validateApiOrigin(runtimeOrigin); if (validated !== window.location.origin) origin = validated; } catch { /* Fail closed without a configured separate origin. */ }
  useEffect(() => {
    if (!origin) return;
    let active = true, busy = false, grant: Grant | undefined, boundSession: string | undefined, submission: string | undefined, ready = false;
    const generation = access.getGeneration(), abort = new AbortController();
    const current = () => active && generation === access.getGeneration() && access.getSnapshot().kind === 'authenticated';
    const send = () => { if (current() && grant) frame.current?.contentWindow?.postMessage({ type: 'LAUNCH_AUTHORIZATION', bridgeId, launchGrant: grant.launchGrant }, origin); };
    async function confirmReceipt(submissionId?: string) {
      if (!current() || !boundSession || !navigator.onLine) return;
      const result = await api.session(boundSession, abort.signal);
      if (!current() || result.kind !== 'success') return;
      if (result.data.receipt && (!submissionId || result.data.receipt.submissionId === submissionId)) setStatus('Kudlab confirma la evidencia guardada. Consulta la sesión para revisar el procesamiento.');
    }
    async function authorize() {
      if (!current() || busy || grant || !submission) return;
      busy = true; setCanRetry(false); setStatus('Confirmando autorización con Kudlab…');
      const timer = setTimeout(() => abort.abort(), 15000);
      const result = await api.recover(recoverySessionId, submission, requestId, abort.signal);
      clearTimeout(timer); busy = false;
      if (!current()) return;
      if (result.kind !== 'success') { setCanRetry(true); setStatus('No se confirmó la autorización. Reintenta con la misma solicitud; no se creará otra partida automáticamente.'); return; }
      if (result.data.runtimeOrigin !== origin || result.data.sessionId !== recoverySessionId) { setStatus('La autorización no coincide con el origen o la sesión solicitada. No se enviará al juego.'); return; }
      grant = result.data; boundSession = grant.sessionId; setSessionId(boundSession);
      send(); setStatus('Recuperación autorizada: solo entrega y acuse, sin otro intento.');
    }
    const listener = (event: MessageEvent) => {
      if (!current() || !acceptsRuntimeMessage(event, origin!, frame.current?.contentWindow, bridgeId)) return;
      const data = event.data as { type: string; sessionId?: string; submissionId?: string };
      if (data.type === 'RUNTIME_READY') {
        ready = true;
        if (grant && navigator.onLine) void confirmReceipt();
        return;
      }
      if (!ready) return;
      if (data.type === 'RECOVERY_UNAVAILABLE' && data.sessionId === recoverySessionId) {
        boundSession = recoverySessionId; setSessionId(recoverySessionId);
        setStatus('No hay una copia local de ese envío en este contexto. Usa el mismo sitio, dispositivo y perfil donde se realizó la actividad. No se reconstruirán respuestas.');
        void confirmReceipt(); return;
      }
      if (data.type === 'RECOVERY_REQUESTED' && data.sessionId === recoverySessionId) { submission = data.submissionId; void authorize(); return; }
      if (!boundSession || data.sessionId !== boundSession) return;
      if (data.type === 'DELIVERY_PENDING') setStatus('Hay evidencia local pendiente. No borres los datos del sitio; el servidor todavía debe confirmar la recepción.');
      if (data.type === 'EXECUTION_FINISHED') setStatus('Actividad finalizada. Comprobando la persistencia en Kudlab…');
      if (data.type === 'RESULTS_SAVED' || data.type === 'EXECUTION_FINISHED') void confirmReceipt(data.submissionId);
    };
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const online = () => void confirmReceipt();
    window.addEventListener('message', listener); window.addEventListener('beforeunload', leave); window.addEventListener('online', online);
    const timeout = setTimeout(() => { if (current() && !ready) setStatus('El juego no confirmó el puente. Revisa su origen, las cabeceras y el almacenamiento del navegador.'); }, 12000);
    return () => { active = false; abort.abort(); clearTimeout(timeout); window.removeEventListener('message', listener); window.removeEventListener('beforeunload', leave); window.removeEventListener('online', online); };
  }, [origin, bridgeId, recoverySessionId, api, access, requestId, retry]);
  return <div className="staff-stack"><ActivityHeading>Recuperar envío</ActivityHeading><p>{studentName}. Solo entrega resultados guardados de la sesión seleccionada, ya iniciada en este navegador; no permite jugar ni consume otro intento.</p><p role="status">{status}</p>
    <div className="staff-actions">{canRetry && <Button onClick={() => setRetry(v => v + 1)}>Reintentar autorización</Button>}{sessionId && <ActivityLink href={studentTasksPath(groupId, studentId, sessionId)}>Consultar sesión</ActivityLink>}
      <AlertDialog><AlertDialogTrigger render={<Button variant="outline" />}>Salir de la recuperación</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Salir de la recuperación?</AlertDialogTitle><AlertDialogDescription>Cerrar esta vista no confirma el envío. La evidencia pendiente se conserva en este navegador. No borres los datos del sitio.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Seguir aquí</AlertDialogCancel><Button onClick={() => go(studentTasksPath(groupId, studentId))}>Salir y consultar sesiones</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
    {!origin ? <p role="alert">Falta un origen separado y válido de Kudlab Play. No se puede abrir la actividad.</p> : <iframe key={retry} ref={frame} title="Kudlab Play · recuperación de envío" className="activity-frame" src={`${origin}/?bridgeId=${bridgeId}&recoverySessionId=${encodeURIComponent(recoverySessionId)}`} referrerPolicy="no-referrer" allow="camera 'none'; microphone 'none'; geolocation 'none'" />}
  </div>;
}
