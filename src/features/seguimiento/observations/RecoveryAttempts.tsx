import { Button } from '@/components/ui/button';
import type { Attempt } from './recovery.ts';
import { behaviors, frequencies, messages } from './types.ts';

export function RecoveryAttempts({ attempts, busy, reconcile, retry, canWrite }: {
  attempts: Attempt[]; busy: boolean; reconcile(attempt: Attempt): void; retry?(attempt: Attempt): void; canWrite: boolean;
}) {
  return <div className="space-y-4">{attempts.map(attempt => <div key={attempt.reference.requestId} className="rounded-lg border border-border p-4 space-y-2">
    <h4 className="font-semibold">{attempt.phase === 'confirmed' ? 'Guardado confirmado' : attempt.phase === 'rejected' ? 'Intento rechazado' : 'Resultado sin confirmar'}</h4>
    {attempt.phase === 'confirmed' && attempt.receipt ? <><p>{behaviors[attempt.receipt.revision.behavior]} · {frequencies[attempt.receipt.revision.frequency]} · Versión {attempt.receipt.revision.version}</p>
      <p className="text-sm text-muted">Este recibo confirma la revisión guardada por este intento. Consulta el historial para conocer el valor vigente.</p></> : attempt.phase === 'rejected' ? <p>{attempt.reason?.split(',').map(reason => messages[reason] ?? 'No se guardó este intento. Revisa los campos antes de preparar otro.').join(' ')}</p> : <>
      <p className="text-sm">No sabemos aún si se guardó. Una consulta sin recibo no demuestra que se haya deshecho. No se reenviará automáticamente.</p>
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => reconcile(attempt)}>Comprobar intento</Button>
        {retry && <Button type="button" variant="outline" disabled={busy || !canWrite} onClick={() => retry(attempt)}>{attempt.body ? 'Revisar el mismo envío' : 'Reconstruir el mismo envío'}</Button>}</div>
    </>}
    <p className="text-sm break-all text-muted">Identificador del intento: {attempt.reference.requestId}</p>
  </div>)}</div>;
}
