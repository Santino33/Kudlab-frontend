import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Student } from '../../academico/students/types.ts';
import type { DraftSlot, StudentRefresh } from '../../academico/students/student-drafts.ts';
import type { ObservationsApi } from './api.ts';
import { emptyForm, formInput, formIssues, messages, toForm, valued } from './types.ts';
import type { Field, FormValues, Observation } from './types.ts';
import type { Attempt } from './recovery.ts';
import { useCapture } from './use-capture.ts';
import type { CaptureLifecycle } from './use-capture.ts';
import { ObservationForm } from './ObservationForm';
import { ObservationHistory } from './ObservationHistory';
import { RecoveryAttempts } from './RecoveryAttempts';

export type ObservationDraft = { form: FormValues; attempts: Attempt[]; correction?: { id: string; expectedVersion: number }; retryId?: string; focus?: string; reviewRequired?: boolean; deliberateNew?: boolean };
export function StudentObservations({ api, apiOrigin, actorId, student, refresh, consentState, draft, lease, recheck }: {
  api: ObservationsApi; apiOrigin: string; actorId: string; student: Student; refresh: StudentRefresh; consentState?: 'CURRENT' | 'NONE' | 'REVOKED';
  draft: DraftSlot<ObservationDraft>; lease: CaptureLifecycle; recheck(): void;
}) {
  const [denied, setDenied] = useState(false), deniedRef = useRef(false);
  const lifecycle = useRef<CaptureLifecycle>({ valid: () => !deniedRef.current && lease.valid(), onStop: callback => lease.onStop(callback) }).current;
  function lost() { draft.write(undefined); deniedRef.current = true; setDenied(true); recheck(); }
  const capture = useCapture<ObservationDraft>({ api, apiOrigin, actorId, draft, lease: lifecycle, initial: () => ({ form: emptyForm(), attempts: [] }), matches: r => r.studentId === student.id && (!r.groupId || r.groupId === student.groupId), lost });
  const { value, ref, update, busy } = capture;
  const [message, setMessage] = useState(''), [errors, setErrors] = useState<Partial<Record<Field, string>>>({}), [historyRevision, setHistoryRevision] = useState(0);
  const result = useRef<HTMLParagraphElement>(null);
  const eligible = student.isActive && consentState === 'CURRENT' && refresh.status === 'ready';
  const uncertain = value.attempts.filter(a => a.phase === 'uncertain'), retry = value.attempts.find(a => a.reference.requestId === value.retryId);
  const disabled = busy || !eligible || Boolean(capture.storageError) || Boolean(value.reviewRequired) || Boolean(uncertain.length && !retry && !value.deliberateNew);
  function tell(text: string) { setMessage(text); requestAnimationFrame(() => { if (capture.valid()) result.current?.focus(); }); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (disabled || !capture.valid()) return;
    const issues = formIssues(ref.current.form); setErrors(issues);
    if (Object.keys(issues).length) { tell('Revisa los campos indicados. No se envió la observación.'); return; }
    if (!valued(ref.current.form.frequency)) { tell('Captura omitida: no se creó una observación ni una constancia de revisión.'); return; }
    if (ref.current.correction && (!Number.isInteger(ref.current.correction.expectedVersion) || ref.current.correction.expectedVersion < 1)) { tell('Indica la versión original del intento antes de reconstruir la corrección.'); return; }
    const body = { ...formInput(ref.current.form), requestId: retry?.reference.requestId ?? crypto.randomUUID(), ...(retry?.reference.groupId ? { groupId: retry.reference.groupId } : {}), ...(ref.current.correction ? { expectedVersion: ref.current.correction.expectedVersion } : {}) };
    const deliberateNew = ref.current.deliberateNew; update({ ...ref.current, deliberateNew: false });
    const outcome = await capture.run(engine => engine.send(student.id, body, ref.current.correction?.id, retry?.reference, deliberateNew));
    if (!capture.valid()) return;
    if (outcome === 'confirmed') { update({ ...ref.current, retryId: undefined, reviewRequired: true }); setHistoryRevision(n => n + 1); tell('Guardado confirmado. Consulta el historial vigente o inicia expresamente una nueva observación.'); }
    else if (outcome === 'storage') tell('No pudimos conservar la referencia. No se inició el envío.');
    else if (outcome === 'mismatch') tell('Los datos no coinciden con la huella del intento anterior. Reconstruye exactamente ese contenido; no crearemos otro identificador.');
    else if (outcome === 'rejected') {
      const rejected = ref.current.attempts.at(-1), reason = rejected?.reason;
      setErrors(Object.fromEntries((rejected?.issues ?? []).map(issue => [issue.field, messages[issue.reason]])));
      if (reason?.includes('STALE_VERSION') || reason?.includes('AUTHOR_REQUIRED') || reason?.includes('CORRECTION_CLOSED')) update({ ...ref.current, reviewRequired: true, retryId: undefined });
      if (reason?.includes('STALE_VERSION')) setHistoryRevision(n => n + 1);
      tell('El intento fue rechazado. Revisa el resultado y consulta los datos actuales antes de decidir otro envío.');
      if (reason?.includes('STUDENT_INACTIVE') || reason?.includes('CONSENT_REQUIRED')) recheck();
    } else tell('El resultado sigue sin confirmar. Comprueba el intento antes de reenviar.');
  }
  function correct(item: Observation) {
    if (busy || uncertain.length || !eligible || !capture.valid()) return;
    update({ ...ref.current, form: toForm(item.revision), correction: { id: item.id, expectedVersion: item.version }, retryId: undefined, reviewRequired: false, focus: 'observation-behavior' });
    setErrors({}); tell('Revisa los seis campos. Solo el autor aún responsable y antes de 24 horas puede corregir; el servidor comprobará los permisos y la versión.');
    requestAnimationFrame(() => { if (capture.valid()) document.getElementById('observation-behavior')?.focus(); });
  }
  if (denied) return <p role="status">La consulta ya no está autorizada. El contenido se retiró mientras se comprueba el acceso.</p>;
  return <section aria-labelledby="observations-title" className="rounded-xl border border-border bg-white p-5 sm:p-8 space-y-6" onFocusCapture={event => { if (event.target.id) update({ ...ref.current, focus: event.target.id }); }}>
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2 min-w-0 [overflow-wrap:anywhere]"><h2 id="observations-title" className="text-xl font-semibold">Observaciones</h2><p className="text-sm text-muted break-words">Registro individual de {student.firstName} {student.lastName} · Código {student.studentCode}</p></div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { update({ form: emptyForm(), attempts: ref.current.attempts, deliberateNew: true }); setErrors({}); tell('Nueva observación independiente. Los intentos anteriores sin confirmar siguen pendientes y visibles; no se cancelan ni se reemplazan.'); }}>Nueva observación</Button></header>
    {!eligible && <p role="status">{refresh.status !== 'ready' ? 'Las escrituras esperan una comprobación actual del estudiante.' : !student.isActive ? 'Estudiante inactivo: solo consulta histórica.' : consentState === undefined ? 'No se pudo comprobar el consentimiento. Puedes consultar el historial, pero no guardar.' : 'Sin consentimiento vigente: solo consulta histórica.'}</p>}
    {capture.storageError && <p role="alert">{capture.storageError}</p>}
    <p id="observation-result" ref={result} role="status" tabIndex={-1} className="empty:hidden">{message}</p>
    {value.attempts.length > 0 && <h3 className="text-lg font-semibold">Resultados de los intentos</h3>}
    <RecoveryAttempts attempts={value.attempts} busy={busy} canWrite={eligible} reconcile={attempt => { void capture.run(engine => engine.reconcile(attempt)).then(() => { if (capture.valid()) { if (ref.current.attempts.find(a => a.reference.requestId === attempt.reference.requestId)?.phase === 'confirmed') update({ ...ref.current, reviewRequired: true, retryId: undefined }); setHistoryRevision(n => n + 1); tell('Consulta del intento terminada. Revisa si hay un recibo confirmado; su ausencia no demuestra que el envío falló.'); } }); }} retry={attempt => {
      update({ ...ref.current, retryId: attempt.reference.requestId, reviewRequired: false,
        form: attempt.body ? toForm(attempt.body) : emptyForm(), correction: attempt.reference.observationId ? { id: attempt.reference.observationId, expectedVersion: attempt.body?.expectedVersion ?? 0 } : undefined });
      tell(attempt.body ? 'Revisa los mismos datos antes de reenviar el intento.' : 'Reconstruye los datos originales. La huella debe coincidir antes de reenviar; una corrección requiere también la versión original.');
    }} />
    <div className="grid items-start gap-8 xl:grid-cols-2">
    <div className="space-y-4 min-w-0"><h3 className="text-lg font-semibold">{value.correction ? 'Corregir observación' : 'Registrar observación'}</h3>
      {Object.keys(errors).length > 0 && <div role="alert" className="rounded-lg border border-border p-4 space-y-2"><p className="font-medium">Revisa los campos indicados</p><ul>{Object.entries(errors).map(([field, text]) => <li key={field}>{Object.hasOwn(value.form, field) ? <a className="staff-link" href={`#observation-${field}`}>{text}</a> : text}</li>)}</ul></div>}
      {value.correction && <p className="text-sm">Se conservarán el original y las correcciones. Versión de partida: {value.correction.expectedVersion || 'por reconstruir'}.</p>}
      {retry?.reference.observationId && !retry.body && <div className="space-y-2"><label htmlFor="observation-expected-version" className="font-medium">Versión original del intento</label><input id="observation-expected-version" type="number" min="1" step="1" className="min-h-11 w-full rounded-lg border border-input px-3" value={value.correction?.expectedVersion || ''} onChange={e => update({ ...ref.current, correction: { id: retry.reference.observationId!, expectedVersion: Number(e.target.value) } })} /></div>}
      <ObservationForm value={value.form} change={form => { update({ ...ref.current, form }); setErrors({}); }} errors={errors} disabled={disabled} correction={Boolean(value.correction)} onSubmit={submit} />
    </div>
    <ObservationHistory api={api} studentId={student.id} revision={refresh.revision + historyRevision} valid={capture.valid} lost={lost} correct={correct} canWrite={eligible && !busy && !uncertain.length} />
    </div>
  </section>;
}
