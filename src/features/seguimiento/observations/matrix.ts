import type { ConsentsApi } from '../../academico/consents/api.ts';
import type { Student } from '../../academico/students/types.ts';
import { formInput, formIssues, valued } from './types.ts';
import type { FormValues, Input } from './types.ts';
import type { Attempt, createWriteSession } from './recovery.ts';

export type MatrixRow = { studentId: string; frequency: string; body?: Input; status: 'ready' | 'omitted' | 'sending' | 'confirmed' | 'rejected' | 'uncertain' | 'notSent'; reason?: string };
export type MatrixDraft = { form: FormValues; rows: MatrixRow[]; attempts: Attempt[]; frozen: boolean; focus?: string; deliberateNew?: boolean; rebuilding?: string };
export function prepareMatrix(form: FormValues, roster: readonly Student[], selections: readonly MatrixRow[], groupId: string) {
  const issues = formIssues(form, new Date(), true);
  if (Object.keys(issues).length) return { issues };
  if (new Set(roster.map(s => s.id)).size !== roster.length || roster.some(s => s.groupId !== groupId) || selections.some(r => !roster.some(s => s.id === r.studentId)))
    return { issues: { observation: 'La pertenencia del curso debe comprobarse de nuevo.' } };
  const rows: MatrixRow[] = roster.map(student => {
    const frequency = selections.find(r => r.studentId === student.id)?.frequency ?? '';
    if (!frequency || frequency === 'UNOBSERVED') return { studentId: student.id, frequency, status: 'omitted' };
    if (!valued(frequency)) return { studentId: student.id, frequency, status: 'rejected', reason: 'Frecuencia no admitida.' };
    return { studentId: student.id, frequency, status: 'ready', body: { ...formInput({ ...form, frequency }), requestId: crypto.randomUUID(), groupId } };
  });
  return { rows };
}
export async function sendMatrix({ rows, groupId, consents, engine, valid, changed, lost, signal, retry = false, deliberateNew = false }: {
  rows: readonly MatrixRow[]; groupId: string; consents: ConsentsApi; engine: ReturnType<typeof createWriteSession>; valid(): boolean;
  changed(row: MatrixRow): void; lost(): void; signal: AbortSignal; retry?: boolean; deliberateNew?: boolean;
}) {
  for (const row of rows) {
    if (!valid() || signal.aborted) break;
    if (!row.body || row.status === 'omitted' || row.status === 'confirmed') continue;
    const attempt = engine.read().find(a => a.reference.requestId === row.body!.requestId);
    if (attempt?.phase === 'confirmed') { changed({ ...row, status: 'confirmed' }); continue; }
    if (attempt?.phase === 'uncertain' && !retry) { changed({ ...row, status: 'uncertain' }); continue; }
    changed({ ...row, status: 'sending', reason: undefined });
    // Fresh individual authorization, not a cached/batch decision, immediately before each write.
    const snapshot = await consents.snapshot(row.studentId, signal);
    if (!valid() || signal.aborted) break;
    if (snapshot.kind !== 'success') {
      changed({ ...row, status: attempt?.phase === 'uncertain' ? 'uncertain' : 'notSent', reason: 'No se pudo comprobar la elegibilidad; no se inició una escritura nueva.' });
      if (snapshot.kind === 'obsolete' || snapshot.kind === 'error' && [401, 403, 404].includes(snapshot.status)) { lost(); break; }
      continue;
    }
    if (snapshot.data.student.id !== row.studentId || snapshot.data.student.groupId !== groupId) { lost(); break; }
    if (!snapshot.data.student.isActive || snapshot.data.consent.state !== 'CURRENT') {
      changed({ ...row, status: attempt?.phase === 'uncertain' ? 'uncertain' : 'rejected', reason: 'Estudiante inactivo o sin consentimiento vigente. No se habilita otra escritura; un intento previo incierto requiere consultar recibo.' }); continue;
    }
    const outcome = await engine.send(row.studentId, row.body, undefined, attempt?.reference, deliberateNew);
    if (!valid() || signal.aborted) break;
    const status = outcome === 'confirmed' ? 'confirmed' : outcome === 'rejected' ? 'rejected' : outcome === 'uncertain' ? 'uncertain' : 'notSent';
    changed({ ...row, status, ...(outcome === 'storage' ? { reason: 'No se pudo conservar la referencia: esta fila no se envió.' } : {}) });
    if (outcome === 'blocked' || outcome === 'storage' || outcome === 'mismatch') break;
  }
}
