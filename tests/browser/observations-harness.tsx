import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentObservations } from '../../src/features/seguimiento/observations/StudentObservations';
import type { ObservationDraft } from '../../src/features/seguimiento/observations/StudentObservations';
import { ObservationMatrixRoute } from '../../src/features/seguimiento/observations/ObservationMatrixRoute';
import { createObservationsApi, observationAccess } from '../../src/features/seguimiento/observations/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import { createGroupsApi } from '../../src/features/academico/groups/api.ts';
import { createStudentsApi } from '../../src/features/academico/students/api.ts';
import { createConsentsApi } from '../../src/features/academico/consents/api.ts';
import { fingerprint } from '../../src/features/seguimiento/observations/recovery.ts';
import { createStudentDraftHost } from '../../src/features/academico/students/student-drafts.ts';
import type { DraftSlot } from '../../src/features/academico/students/student-drafts.ts';
import type { AuthController } from '../../src/auth/controller.ts';
import type { Observation, Receipt, Revision } from '../../src/features/seguimiento/observations/types.ts';
import '../../src/styles.css';
import { Button } from '../../src/components/ui/button';

if (!import.meta.env.DEV) throw new Error('Synthetic harness only in development mode');
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const group = { id: uuid(20), name: 'Curso de prueba', grade: 'Primero', schoolYear: 2026, teacherId: uuid(30), teacherName: 'Docente ficticio', studentCount: 4 };
const roster = [1, 2, 3, 4].map(n => ({ id: uuid(n), groupId: group.id, firstName: `Participante ${String.fromCharCode(64 + n)}`, lastName: 'Ficticio', studentCode: `OBS-${n}`, isActive: true }));
type Model = { history: Observation[]; revisions: Record<string, Revision[]>; receipts: Record<string, Receipt>; calls: { path: string; method: string; body?: unknown }[];
  mode: 'ready' | 'lost' | 'readFailed' | 'stale' | 'denied'; revoked: string[]; serial: number };
const globals = window as unknown as { observationModel: Model };
const model = globals.observationModel ?? { history: [], revisions: {}, receipts: {}, calls: [], mode: 'ready', revoked: [], serial: 50 };
globals.observationModel = model;
const origin = 'http://localhost:39871', actorId = uuid(40);
let generation = 1;
const access = { getGeneration: () => generation, notify() {} };
const fakeFetch: typeof fetch = async (url, init) => {
  const parsed = new URL(String(url)), path = parsed.pathname, method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  model.calls.push({ path, method, ...(body ? { body } : {}) });
  const fail = (status: number, code: string, reason?: string) => Response.json({ code, message: 'Fixed synthetic response', ...(reason ? { fields: [{ field: 'observation', reason }] } : {}) }, { status });
  if (model.mode === 'denied') return fail(404, 'NOT_FOUND');
  if (path === `/api/v1/groups/${group.id}`) return model.mode === 'readFailed' ? fail(503, 'UNAVAILABLE') : Response.json(group);
  if (path === `/api/v1/groups/${group.id}/students`) return model.mode === 'readFailed' ? fail(503, 'UNAVAILABLE') : Response.json({ items: roster });
  const studentId = path.split('/')[4]!, student = roster.find(s => s.id === studentId);
  if (path.endsWith('/consents') && student) return Response.json({ student, consent: { state: model.revoked.includes(studentId) ? 'REVOKED' : 'CURRENT', version: 1,
    currentRecord: { id: uuid(31), signedOn: '2026-01-01', receivedOn: '2026-01-02', mediaType: 'image/png', byteSize: 1, sha256: 'a'.repeat(64) } }, evaluatedAt: new Date().toISOString() });
  if (path.includes('/observation-requests/')) return Response.json({ receipt: model.receipts[path.split('/').at(-1)!] ?? null });
  if (method === 'POST' && body) {
    if (model.revoked.includes(studentId)) return fail(409, 'CONFLICT', 'CONSENT_REQUIRED');
    const correction = path.endsWith('/revisions'), observationId = correction ? path.split('/').at(-2)! : uuid(++model.serial);
    const hash = await fingerprint(studentId, body, correction ? observationId : undefined), prior = model.receipts[body.requestId];
    if (prior) return prior.fingerprint === hash ? Response.json({ receipt: prior, repeated: true }) : fail(409, 'CONFLICT', 'REQUEST_MISMATCH');
    const current = model.history.find(o => o.id === observationId);
    if (correction && (model.mode === 'stale' || current?.version !== body.expectedVersion)) return fail(409, 'CONFLICT', 'STALE_VERSION');
    const revision: Revision = { id: uuid(++model.serial), behavior: body.behavior, frequency: body.frequency, area: body.area, observedOn: body.observedOn,
      schoolYear: body.schoolYear, term: body.term, actorId: uuid(30), version: correction ? body.expectedVersion + 1 : 1, recordedAt: new Date().toISOString() };
    const observation: Observation = { id: observationId, studentId, author: { id: uuid(30), name: 'Docente ficticio' }, createdAt: current?.createdAt ?? revision.recordedAt, version: revision.version, revision };
    model.history = [observation, ...model.history.filter(o => o.id !== observationId)].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    model.revisions[observationId] = [...(model.revisions[observationId] ?? []), revision];
    const receipt = { requestId: body.requestId, studentId, observationId, fingerprint: hash, revision }; model.receipts[body.requestId] = receipt;
    if (model.mode === 'lost') throw new TypeError('Synthetic response lost after mock commit');
    return Response.json({ receipt, repeated: false }, { status: 201 });
  }
  if (model.mode === 'readFailed') return fail(503, 'UNAVAILABLE');
  if (path.endsWith('/revisions')) { const id = path.split('/').at(-2)!; return Response.json({ observation: model.history.find(o => o.id === id), items: model.revisions[id] ?? [], nextCursor: null }); }
  if (path.endsWith('/observations')) {
    const q = parsed.searchParams;
    const items = model.history.filter(o => o.studentId === studentId).filter(o => ['schoolYear', 'term', 'behavior'].every(k => !q.has(k) || String(o.revision[k as 'schoolYear']) === q.get(k)))
      .filter(o => !q.has('area') || (o.revision.area ?? 'UNSPECIFIED') === q.get('area')).filter(o => !q.has('observedFrom') || o.revision.observedOn >= q.get('observedFrom')!)
      .filter(o => !q.has('observedTo') || o.revision.observedOn <= q.get('observedTo')!);
    return Response.json({ items, nextCursor: null });
  }
  return fail(404, 'NOT_FOUND');
};
const api = createObservationsApi(origin, access, fakeFetch), consents = createConsentsApi(origin, access, fakeFetch);
const academicHttp = createHttpClient(origin, observationAccess(access), fakeFetch), groups = createGroupsApi(academicHttp), students = createStudentsApi(academicHttp, undefined, group.id);
function Harness() {
  const [matrix] = useState(new URLSearchParams(location.search).has('matrix'));
  const [mounted, setMounted] = useState(true), [version, setVersion] = useState(0), [revoked, setRevoked] = useState(false);
  const state = useRef({ kind: 'authenticated', generation, denied: false, user: { id: actorId, role: 'TEACHER' } });
  const [host] = useState(() => createStudentDraftHost({ getSnapshot: () => state.current, getGeneration: () => generation } as Pick<AuthController, 'getSnapshot' | 'getGeneration'>));
  const capture = host.capture();
  const [lease, setLease] = useState(() => host.confirm({ apiOrigin: origin, actorId, role: 'TEACHER', groupId: group.id,
    ...(matrix ? { kind: 'observationMatrix' as const } : { kind: 'student' as const, studentId: roster[0]!.id }) }, capture.generation, capture.epoch)!);
  const studentSlot = useRef(lease.slot('observations') as DraftSlot<ObservationDraft>);
  function resume() {
    generation++; state.current = { ...state.current, kind: 'authenticated', generation };
    const capture = host.capture(), next = host.confirm({ apiOrigin: origin, actorId, role: 'TEACHER', groupId: group.id,
      ...(matrix ? { kind: 'observationMatrix' as const } : { kind: 'student' as const, studentId: roster[0]!.id }) }, capture.generation, capture.epoch)!;
    studentSlot.current = next.slot('observations') as DraftSlot<ObservationDraft>;
    setLease(next); setMounted(true);
  }
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8 text-foreground">
    <header className="space-y-2"><p className="font-semibold">Kudlab · Ensayo sintético aislado</p><h1 className="auth-heading">{matrix ? 'Registrar observaciones' : 'Ficha de Participante A Ficticio'}</h1><p>Componentes propios, no composición final de App ni prueba contra Backend.</p></header>
    <div className="flex flex-wrap gap-3" aria-label="Controles exclusivos del ensayo"><Button variant="outline" id="suspend" onClick={() => { host.suspend(); generation++; setMounted(false); }}>Simular suspensión</Button><Button variant="outline" id="resume" onClick={resume}>Reconfirmar acceso sintético</Button><Button variant="outline" id="revoke" onClick={() => { model.revoked = [roster[0]!.id]; setRevoked(true); setVersion(n => n + 1); }}>Simular revocación</Button></div>
    {mounted ? matrix ? <ObservationMatrixRoute key={generation} {...{ api, consents, groups, students, apiOrigin: origin, actorId }} drafts={host} groupId={group.id} isCurrentSelection={() => true} /> :
      <StudentObservations key={generation} {...{ api, apiOrigin: origin, actorId, lease }} student={roster[0]!} refresh={{ revision: version, status: 'ready' }} consentState={revoked ? 'REVOKED' : 'CURRENT'} draft={studentSlot.current} recheck={() => { if (model.mode === 'denied') { host.discard(); setMounted(false); } }} /> : <p role="status">Contenido privado retirado por la suspensión.</p>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
