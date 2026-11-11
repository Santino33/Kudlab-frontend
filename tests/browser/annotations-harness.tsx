import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentAnnotations } from '../../src/features/seguimiento/annotations/StudentAnnotations';
import { createStudentDraftHost } from '../../src/features/academico/students/student-drafts.ts';
import type { AuthController } from '../../src/auth/controller.ts';
import type { Annotation } from '../../src/features/seguimiento/annotations/types.ts';
import type { AnnotationsApi } from '../../src/features/seguimiento/annotations/api.ts';
import { Button } from '../../src/components/ui/button';
import '../../src/styles.css';

if (!import.meta.env.DEV) throw new Error('Synthetic component harness only');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const student = { id: id(1), groupId: id(2), studentCode: 'ANN-FICTICIO', firstName: 'Ana', lastName: 'Ficticia', isActive: true };
const model = { items: [] as Annotation[], writes: 0, readFailed: false, denied: false, serial: 10 };
(window as unknown as { annotationModel: typeof model }).annotationModel = model;
const api: AnnotationsApi = {
  async list() {
    if (model.denied) return { kind: 'error', status: 404, code: 'NOT_FOUND', uncertain: false };
    if (model.readFailed) return { kind: 'unavailable', uncertain: false };
    return { kind: 'success', data: { studentId: student.id, isActive: student.isActive, canCreate: student.isActive,
      items: model.items.map(item => ({ ...item, canEdit: student.isActive, canDelete: student.isActive })), nextCursor: null } };
  },
  async create(studentId, text) {
    model.writes++;
    const row: Annotation = { id: id(++model.serial), studentId, text, author: { id: id(3), name: 'Docente A Ficticio' },
      createdAt: new Date().toISOString(), updatedAt: null, canEdit: true, canDelete: true };
    model.items.unshift(row); return { kind: 'success', data: row };
  },
  async update(before, text) {
    model.writes++; const row = { ...before, text, updatedAt: new Date().toISOString() };
    model.items = model.items.map(item => item.id === row.id ? row : item); return { kind: 'success', data: row };
  },
  async remove(before) {
    model.writes++; model.items = model.items.filter(item => item.id !== before.id);
    return { kind: 'success', data: { id: before.id, studentId: before.studentId, deleted: true } };
  },
};
function Harness() {
  const state = useRef({ kind: 'authenticated', generation: 1, denied: false, user: { id: 'actor', role: 'TEACHER' } });
  const [host] = useState(() => createStudentDraftHost({ getSnapshot: () => state.current, getGeneration: () => state.current.generation } as Pick<AuthController, 'getSnapshot' | 'getGeneration'>));
  const key = { kind: 'student' as const, apiOrigin: 'http://localhost:4393', actorId: 'actor', role: 'TEACHER' as const, studentId: student.id, groupId: student.groupId };
  const capture = host.capture();
  const [lease, setLease] = useState(() => host.confirm(key, capture.generation, capture.epoch)!);
  const [visible, setVisible] = useState(true), [revision, setRevision] = useState(0);
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <header className="space-y-2"><p className="font-semibold">Kudlab · Ensayo aislado de componente</p><h1 className="auth-heading">Ficha de Ana Ficticia</h1><p>API simulada y host real. No prueba final App/Backend/BD.</p></header>
    <div className="flex flex-wrap gap-3"><Button id="suspend" variant="outline" onClick={() => { host.suspend(); state.current.generation++; setVisible(false); }}>Suspender ensayo</Button>
      <Button id="resume" variant="outline" onClick={() => { state.current.generation++; const current = host.capture(); setLease(host.confirm(key, current.generation, current.epoch)!); setVisible(true); }}>Revalidar ensayo</Button>
      <Button id="refresh" variant="outline" onClick={() => setRevision(n => n + 1)}>Refrescar ensayo</Button>
      <Button id="inactive" variant="outline" onClick={() => { student.isActive = false; setRevision(n => n + 1); }}>Inactivar ensayo</Button></div>
    {visible ? <StudentAnnotations key={state.current.generation} api={api} student={student} refresh={{ revision, status: 'ready' }} draft={lease.slot('annotations')} lease={lease}
      recheck={() => setRevision(n => n + 1)} onAccessLost={() => { host.discard(); setVisible(false); }} /> : <p role="status">Contenido privado retirado.</p>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
