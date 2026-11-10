import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/App.tsx';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import { createStudentDraftHost } from '../../src/features/academico/students/student-drafts.ts';
import { ObservationMatrixRoute } from '../../src/features/seguimiento/observations/ObservationMatrixRoute';
import { createObservationsApi } from '../../src/features/seguimiento/observations/api.ts';
import { createConsentsApi } from '../../src/features/academico/consents/api.ts';
import { createGroupsApi, type GroupsApi } from '../../src/features/academico/groups/api.ts';
import { createStudentsApi, type StudentsApi } from '../../src/features/academico/students/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import type { Group } from '../../src/features/academico/groups/types.ts';
import type { Student } from '../../src/features/academico/students/types.ts';
import type { Observation, Receipt } from '../../src/features/seguimiento/observations/types.ts';
import { fingerprint } from '../../src/features/seguimiento/observations/recovery.ts';
import '../../src/styles.css';

// Test-only transport. No credentials, external network or Backend/R2 fallback.
if (!import.meta.env.DEV) throw new Error('Synthetic composition harness only');
const scenario = new URLSearchParams(location.search), uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const origin = 'http://localhost:39871', actorId = uuid(40), groupId = uuid(20);
const group: Group = { id: groupId, name: 'Curso de prueba', grade: 'Primero', schoolYear: 2026, teacherId: actorId, teacherName: 'Docente ficticio' };
const students: Student[] = [1, 2].map(n => ({ id: uuid(n), groupId, studentCode: `OBS-${n}`, firstName: `Participante ${String.fromCharCode(64 + n)}`, lastName: 'Ficticio', isActive: true }));
const record = { id: uuid(30), signedOn: '2026-01-01', receivedOn: '2026-01-02', mediaType: 'image/png', byteSize: 1, sha256: 'a'.repeat(64) };
const model = { role: scenario.get('role') === 'ADMIN' ? 'ADMIN' : 'TEACHER', actorId, access: 'ready', consent: 'CURRENT', mode: 'ready', active: true,
  calls: [] as { path: string; method: string }[], rows: [] as Observation[], receipts: {} as Record<string, Receipt>, serial: 100 };
let releaseWrite: (() => void) | undefined;
const deny = (status = 404) => Response.json({ code: status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHENTICATED' : 'UNAVAILABLE', message: 'Synthetic fixed response' }, { status });
const authFetch: typeof fetch = async url => {
  const path = new URL(String(url)).pathname; model.calls.push({ path, method: 'GET' });
  if (path.endsWith('/sign-out')) return Response.json({ success: true });
  if (model.access !== 'ready') return deny(model.access === 'absent' ? 401 : 503);
  return Response.json({ user: { id: model.actorId, name: 'Docente ficticio', email: 'docente@example.edu.co', role: model.role }, session: { id: 'synthetic-session', expiresAt: '2099-01-01T00:00:00.000Z' } });
};
const controller = createAuthController(createAuthClient(origin, authFetch));
const fetcher: typeof fetch = async (url, init) => {
  const path = new URL(String(url)).pathname, method = init?.method ?? 'GET'; model.calls.push({ path, method });
  if (model.mode === 'denied' || path.includes(uuid(99))) return deny();
  if (path === `/api/v1/groups/${groupId}`) return Response.json(group);
  if (path === `/api/v1/groups/${groupId}/students`) return model.mode === 'rosterFailed' ? deny(503) : Response.json({ items: students.map(s => ({ ...s, isActive: model.active })) });
  const student = students.find(s => path.startsWith(`/api/v1/students/${s.id}`));
  if (!student) return deny();
  if (path.endsWith('/consents/history')) return Response.json({ items: model.consent === 'NONE' ? [] : [{ id: record.id, type: 'REGISTER', version: 1, record, previousRecordId: null, author: { id: actorId, name: 'Docente ficticio' }, occurredAt: '2026-01-02T12:00:00.000Z', reason: null }], nextCursor: null });
  if (path.endsWith('/document')) return deny();
  if (path.endsWith('/consents')) {
    if (model.mode === 'consentFailed') return deny(503);
    if (model.mode === 'consentDenied') return deny();
    return Response.json({ student: { ...student, isActive: model.active }, consent: { state: model.consent, version: model.consent === 'NONE' ? 0 : 1, currentRecord: model.consent === 'NONE' ? null : record }, evaluatedAt: new Date().toISOString() });
  }
  if (path === `/api/v1/students/${student.id}`) return model.mode === 'academicDenied' ? deny() : Response.json({ ...student, isActive: model.active });
  if (path.endsWith('/task-assignments')) return model.mode === 'assignmentsFailed' ? deny(503) : Response.json({ items: [], nextCursor: null });
  if (path.includes('/observation-requests/')) return Response.json({ receipt: model.receipts[path.split('/').at(-1)!] ?? null });
  if (path.endsWith('/observations') && method === 'POST') {
    const body = JSON.parse(String(init?.body)), hash = await fingerprint(student.id, body);
    const revision = { id: uuid(++model.serial), actorId, version: 1, recordedAt: new Date().toISOString(), behavior: body.behavior, frequency: body.frequency, area: body.area, observedOn: body.observedOn, schoolYear: body.schoolYear, term: body.term };
    const receipt = { requestId: body.requestId, studentId: student.id, observationId: uuid(++model.serial), fingerprint: hash, revision };
    model.receipts[body.requestId] = receipt; model.rows.unshift({ id: receipt.observationId, studentId: student.id, author: { id: actorId, name: 'Docente ficticio' }, createdAt: revision.recordedAt, version: 1, revision });
    if (model.mode === 'pendingWrite') await new Promise<void>(done => { releaseWrite = done; });
    if (model.mode === 'lostWrite') throw new TypeError('Synthetic reply lost after commit');
    return Response.json({ receipt, repeated: false }, { status: 201 });
  }
  if (path.endsWith('/observations')) return model.mode === 'observationDenied' ? deny() : Response.json({ items: model.rows.filter(row => row.studentId === student.id), nextCursor: null });
  return deny();
};
const go = (path: string) => { history.pushState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); };
const globals = { model, controller, go, hasPendingWrite: () => Boolean(releaseWrite), releaseWrite: () => releaseWrite?.() };
Object.assign(window, { observationComposition: globals });

if (scenario.has('probe')) {
  // Direct real route/host, deferred API doubles deliberately ignore AbortSignal to exercise epoch checks.
  const host = createStudentDraftHost({ getSnapshot: () => ({ kind: 'authenticated', generation: 1, user: { id: actorId, role: 'TEACHER', name: 'Docente ficticio', email: 'docente@example.edu.co' }, denied: false }), getGeneration: () => 1 });
  const access = { getGeneration: () => 1, notify() {} }, api = createObservationsApi(origin, access, fetcher), consents = createConsentsApi(origin, access, fetcher);
  const http = createHttpClient(origin, access, fetcher);
  type GroupResult = Awaited<ReturnType<GroupsApi['detail']>>;
  type RosterResult = Awaited<ReturnType<StudentsApi['list']>>;
  let finishGroup: ((value: GroupResult) => void) | undefined, finishRoster: ((value: RosterResult) => void) | undefined, rosterCalls = 0;
  const groups: GroupsApi = { ...createGroupsApi(http), detail: async () => scenario.get('probe') === 'group' ? new Promise<GroupResult>(done => { finishGroup = done; }) : { kind: 'success', data: group } };
  const roster: StudentsApi = { ...createStudentsApi(http, undefined, groupId), list: async () => { rosterCalls++; return new Promise<RosterResult>(done => { finishRoster = done; }); } };
  let fresh: ReturnType<typeof host.confirm>;
  let selected = 'matrix';
  Object.assign(window, { observationProbe: {
    changeSelection() { selected = 'student'; const c = host.capture(); fresh = host.confirm({ apiOrigin: origin, actorId, role: 'TEACHER', groupId, kind: 'student', studentId: uuid(2) }, c.generation, c.epoch); fresh!.slot('notes').write({ sentinel: 'new-selection' }); },
    finish() { const error = { kind: 'error' as const, status: 404, code: 'NOT_FOUND' as const, uncertain: false }; finishGroup?.(error); finishRoster?.(error); },
    state() { return { rosterCalls, waiting: Boolean(finishGroup || finishRoster), fresh: fresh?.slot('notes').read(), epoch: host.capture().epoch }; },
  } });
  createRoot(document.getElementById('root')!).render(<ObservationMatrixRoute {...{ api, consents, groups, students: roster, drafts: host, apiOrigin: origin, actorId, groupId }} isCurrentSelection={() => selected === 'matrix'} />);
} else {
  const path = scenario.get('path') ?? `/academico/estudiantes/${uuid(1)}`;
  history.replaceState(null, '', path);
  createRoot(document.getElementById('root')!).render(<StrictMode><App {...{ controller, apiOrigin: origin, fetcher, pathname: path, search: '' }} /></StrictMode>);
}
