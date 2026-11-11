import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ConsentsApi } from '../../academico/consents/api.ts';
import type { Student } from '../../academico/students/types.ts';
import type { Group } from '../../academico/groups/types.ts';
import type { DraftSlot } from '../../academico/students/student-drafts.ts';
import type { ObservationsApi } from './api.ts';
import { emptyForm, frequencies, toForm } from './types.ts';
import type { Field } from './types.ts';
import { useCapture } from './use-capture.ts';
import type { CaptureLifecycle } from './use-capture.ts';
import { ObservationFields, selectClass } from './ObservationForm';
import { hasMatrixDraft, prepareMatrix, sendMatrix } from './matrix.ts';
import type { MatrixDraft, MatrixRow } from './matrix.ts';
import { RecoveryAttempts } from './RecoveryAttempts';
import type { Attempt } from './recovery.ts';

const labels: Record<MatrixRow['status'], string> = { ready: 'Lista para enviar', omitted: 'Omitida: sin registro', sending: 'Comprobando y enviando…', confirmed: 'Guardado confirmado', rejected: 'Rechazada', uncertain: 'Resultado sin confirmar', notSent: 'No enviada' };
export function ObservationMatrix({ api, consents, apiOrigin, actorId, group, roster, draft, lease, recheck, onAccessLost = recheck }: {
  api: ObservationsApi; consents: ConsentsApi; apiOrigin: string; actorId: string; group: Group; roster: Student[];
  draft: DraftSlot<MatrixDraft>; lease: CaptureLifecycle; recheck(): void; onAccessLost?(): void;
}) {
  const capture = useCapture({ api, apiOrigin, actorId, draft, lease, initial: () => ({ form: emptyForm(), rows: roster.map(s => ({ studentId: s.id, frequency: '', status: 'ready' as const })), attempts: [], frozen: false }),
    matches: r => r.kind === 'CREATE' && r.groupId === group.id && roster.some(s => s.id === r.studentId), lost: onAccessLost,
    dirty: hasMatrixDraft });
  const { value, ref, update, busy } = capture;
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({}), [message, setMessage] = useState('');
  const queue = useRef<AbortController | undefined>(undefined), queueBusy = useRef(false), summary = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const stop = () => queue.current?.abort(), remove = lease.onStop(stop);
    return () => { remove(); stop(); };
  }, [lease]);
  function changed(row: MatrixRow) { update({ ...ref.current, rows: [...ref.current.rows.filter(r => r.studentId !== row.studentId), row] }); }
  function tell(text: string) { setMessage(text); requestAnimationFrame(() => { if (capture.valid()) summary.current?.focus(); }); }
  async function save(retry = false) {
    if (!capture.navigationAvailable || busy || queueBusy.current || !capture.valid() || capture.storageError) return;
    queueBusy.current = true;
    let rows = ref.current.rows;
    const deliberateNew = ref.current.deliberateNew;
    try {
      if (!ref.current.frozen) {
        if (!deliberateNew && ref.current.attempts.some(a => a.phase === 'uncertain')) { tell('Comprueba los intentos recuperados o elige expresamente Nueva captura; los pendientes seguirán visibles.'); return; }
        const prepared = prepareMatrix(ref.current.form, roster, rows, group.id);
        if (!prepared.rows) { setErrors(prepared.issues ?? {}); tell('Revisa el contexto común. No se envió ninguna fila.'); return; }
        rows = prepared.rows; update({ ...ref.current, rows, frozen: true, deliberateNew: false });
      }
      queue.current = new AbortController();
      const signal = queue.current.signal;
      await capture.run(engine => sendMatrix({ rows, groupId: group.id, consents, engine, valid: capture.valid, changed, lost: onAccessLost, signal, retry, deliberateNew }));
      if (capture.valid()) tell('Revisa el resultado de cada estudiante. Solo las filas con recibo válido están confirmadas; no se afirma un guardado global.');
    } finally { queueBusy.current = false; }
  }
  function reconstruct(attempt: Attempt) {
    if (!capture.valid() || busy) return;
    if (attempt.body) {
      update({ ...ref.current, rebuilding: undefined, form: toForm(attempt.body), frozen: true, rows: [{ studentId: attempt.reference.studentId, frequency: attempt.body.frequency, body: attempt.body, status: 'uncertain' }] });
      tell('Revisa el contexto original y usa Reintentar el mismo envío.');
    } else {
      update({ ...ref.current, rebuilding: attempt.reference.requestId, form: emptyForm(), frozen: false, rows: roster.map(s => ({ studentId: s.id, frequency: '', status: 'ready' })) });
      tell('Reconstruye el contexto y la frecuencia originales de esta fila. La huella debe coincidir antes de iniciar un reenvío.');
    }
  }
  const rebuilding = value.rebuilding;
  async function retryRebuilt() {
    const attempt = ref.current.attempts.find(a => a.reference.requestId === rebuilding); if (!capture.navigationAvailable || !attempt || busy || !capture.valid()) return;
    const prepared = prepareMatrix(ref.current.form, roster, ref.current.rows, group.id);
    if (!prepared.rows) { setErrors(prepared.issues ?? {}); tell('Revisa el contexto común.'); return; }
    const row = prepared.rows.find(r => r.studentId === attempt.reference.studentId);
    if (!row?.body) { tell('Selecciona la frecuencia original del estudiante indicado.'); return; }
    const body = { ...row.body, requestId: attempt.reference.requestId };
    queue.current = new AbortController();
    const result = await capture.run(async engine => {
      const snapshot = await consents.snapshot(row.studentId, queue.current!.signal);
      if (!capture.valid()) return 'blocked';
      if (snapshot.kind !== 'success') {
        if (snapshot.kind === 'error' && [401, 403, 404].includes(snapshot.status)) onAccessLost();
        return 'blocked';
      }
      if (snapshot.data.student.groupId !== group.id) { onAccessLost(); return 'blocked'; }
      if (!snapshot.data.student.isActive || snapshot.data.consent.state !== 'CURRENT') return 'blocked';
      return engine.send(row.studentId, body, undefined, attempt.reference);
    });
    if (capture.valid()) {
      if (result === 'confirmed') { changed({ ...row, body, status: 'confirmed' }); update({ ...ref.current, rebuilding: undefined }); tell('Recibo confirmado para esta fila.'); }
      else tell(result === 'mismatch' ? 'El contenido no coincide con la huella original: no se reenvió.' : 'Revisa el estado del intento; no se confirma un guardado por esta respuesta.');
    }
  }
  const pending = value.attempts.some(a => a.phase === 'uncertain');
  return <section aria-labelledby="matrix-title" className="space-y-6 min-w-0 [overflow-wrap:anywhere]" onFocusCapture={event => { if (event.target.id) update({ ...ref.current, focus: event.target.id }); }}>
    {capture.leaveDialog}
    {!capture.navigationAvailable && <p role="status">La captura está deshabilitada: este navegador no permite comprobar la navegación segura del mismo documento. Puedes consultar los recibos pendientes; el aviso al salir de la página es solo complementario.</p>}
    <header className="space-y-2"><h2 id="matrix-title" className="text-xl font-semibold">Captura por curso</h2><p className="break-words">{group.name} · {roster.length} estudiantes</p><p className="text-sm text-muted">Un contexto común, una frecuencia por estudiante. Las filas sin selección o sin oportunidad se omiten sin crear constancia de revisión.</p></header>
    {capture.storageError && <p role="alert">{capture.storageError}</p>}
    <p ref={summary} role="status" tabIndex={-1} className="empty:hidden">{message}</p>
    <div className="rounded-xl border border-border bg-white p-5 sm:p-8 space-y-5"><h3 className="text-lg font-semibold">Contexto de la captura</h3>
      <ObservationFields prefix="matrix" contextOnly value={value.form} change={form => update({ ...ref.current, form })} errors={errors} disabled={!capture.navigationAvailable || busy || value.frozen} />
      {value.frozen && <p className="text-sm">Contexto congelado para este envío. Una conducta distinta requiere una nueva captura expresa.</p>}
    </div>
    <ul className="divide-y divide-border" aria-label="Frecuencias y resultados por estudiante">{roster.map(student => {
      const row = value.rows.find(r => r.studentId === student.id), attempts = value.attempts.filter(a => a.reference.studentId === student.id);
      const last = attempts.find(a => a.reference.requestId === row?.body?.requestId), status = last?.phase ?? (row?.status === 'sending' && !busy ? 'notSent' : row?.status) ?? 'notSent';
      return <li key={student.id} className="py-5 space-y-4">
        <div className="grid items-start gap-4 md:grid-cols-2"><div className="space-y-1 min-w-0"><h3 className="font-semibold break-words">{student.firstName} {student.lastName}</h3><p className="text-sm text-muted break-words">Código {student.studentCode} · {student.isActive ? 'Activo al consultar' : 'Inactivo al consultar'}</p></div>
          <div className="space-y-2 min-w-0"><Label htmlFor={`matrix-frequency-${student.id}`}>Frecuencia de {student.firstName} {student.lastName}</Label>
            <select id={`matrix-frequency-${student.id}`} className={selectClass} value={row?.frequency ?? ''} disabled={!capture.navigationAvailable || busy || value.frozen} onChange={event => changed({ studentId: student.id, frequency: event.target.value, status: 'ready' })}>
              <option value="">Sin selección</option>{Object.entries(frequencies).map(([v, name]) => <option key={v} value={v}>{name}</option>)}<option value="UNOBSERVED">Sin oportunidad de observar</option>
            </select>
          </div></div>
        <p>{labels[status]}</p>{row?.reason && <p className="text-sm">{row.reason}</p>}
        <RecoveryAttempts attempts={attempts} busy={busy} canWrite={student.isActive} reconcile={attempt => { void capture.run(engine => engine.reconcile(attempt)); }} retry={reconstruct} />
      </li>;
    })}</ul>
    {!roster.length && <p>No hay estudiantes en este curso. No se enviarán registros.</p>}
    <div className="flex flex-wrap gap-3">
      {rebuilding ? <Button disabled={!capture.navigationAvailable || busy || Boolean(capture.storageError)} onClick={() => void retryRebuilt()}>Comprobar huella y reenviar la fila</Button> : <Button disabled={!capture.navigationAvailable || busy || !roster.length || Boolean(capture.storageError)} onClick={() => void save(value.frozen)}>{busy ? 'Procesando estudiantes…' : value.frozen ? 'Reintentar el mismo envío' : 'Guardar filas valoradas'}</Button>}
      <Button variant="outline" disabled={busy} onClick={() => { update({ form: emptyForm(), rows: roster.map(s => ({ studentId: s.id, frequency: '', status: 'ready' })), attempts: ref.current.attempts, frozen: false, deliberateNew: true }); setErrors({}); tell('Nueva captura independiente. Los registros confirmados y los intentos anteriores sin confirmar se conservan; estos últimos siguen pendientes.'); }}>Nueva captura</Button>
    </div>
    {pending && <p className="text-sm">Hay intentos sin confirmar. Comprueba sus recibos incluso si el estudiante ya no es elegible; no iniciarás una nueva captura automáticamente.</p>}
  </section>;
}
