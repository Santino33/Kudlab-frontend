import { createRoot } from 'react-dom/client';
import { AssignmentDetail } from '../../src/features/tareas/activities/Activities';
import { createActivitiesApi } from '../../src/features/tareas/activities/api';
import type { Assignment, CodeMetadata } from '../../src/features/tareas/activities/types';
import { createHttpClient } from '../../src/lib/http';
import '../../src/styles.css';

// Development only: real components/decoders, isolated synthetic transport, no network fallback.
if (!import.meta.env.DEV) throw new Error('Test harness requires development mode');
const id = (n: number) => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const group = { id: id(1), teacherId: id(2), name: 'Curso sintético', grade: 'Quinto', schoolYear: 2026, teacherName: 'Docente sintético' };
const root = createRoot(document.getElementById('root')!);
type Scenario = 'normal' | 'long' | 'empty' | 'loading' | 'error' | 'forbidden' | 'expired';
type Call = { method: string; path: string; requestId?: string };
let calls: Call[] = [], cancelMode = 'success', revealMode = 'success', releaseReveal: (() => void) | undefined;
let sequence = 0;
function mount(scenario: Scenario = 'normal') {
  calls = []; cancelMode = 'success'; revealMode = 'success'; releaseReveal = undefined;
  const now = Date.now();
  let assignment: Assignment = {
    id: id(3), taskId: 'TG-01', title: 'Lluvia de estrellas', groupId: group.id, publishedVersionId: id(4), configVersion: 1,
    status: 'OPEN', availability: 'CURRENT', maxAttempts: 2, recipientCount: scenario === 'empty' ? 0 : 1,
    startsAt: new Date(now - 60000).toISOString(), endsAt: new Date(now + 3600000).toISOString(), createdAt: new Date(now - 60000).toISOString(),
    recipients: scenario === 'empty' ? [] : [{ id: id(5), studentId: id(6), studentDisplayName: scenario === 'long' ? 'Participante sintético con nombres y apellidos extensos para comprobar reflujo' : 'Participante sintético', studentCode: 'SINTETICO', attemptsStarted: 1, activeSessionId: null, canLaunch: true, unavailableReasons: [] }],
  };
  const code: CodeMetadata = { id: id(7), recipientId: id(5), scope: 'PLAY_AND_SUBMIT', sessionId: null, status: scenario === 'expired' ? 'EXPIRED' : 'ACTIVE', canReveal: scenario !== 'expired', unavailableReasons: scenario === 'expired' ? ['OUTSIDE_WINDOW'] : [], createdAt: assignment.createdAt, expiresAt: scenario === 'expired' ? new Date(now - 1000).toISOString() : assignment.endsAt, lastClaimedAt: null };
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname, method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ method, path, ...(body.requestId ? { requestId: body.requestId } : {}) });
    if (scenario === 'forbidden') return Response.json({ code: 'FORBIDDEN' }, { status: 403 });
    if (scenario === 'loading') return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    if (scenario === 'error') return Response.json({ code: 'UNAVAILABLE' }, { status: 503 });
    if (path.endsWith('/reveal')) {
      if (revealMode === 'late') await new Promise<void>(resolve => { releaseReveal = resolve; });
      if (revealMode === 'failure') return Response.json({ code: 'CONFLICT' }, { status: 409 });
      return Response.json({ codeId: code.id, code: 'ERD34', scope: code.scope, expiresAt: code.expiresAt });
    }
    if (path.endsWith('/cancel')) {
      if (cancelMode === 'lost') throw new TypeError('Synthetic lost response');
      if (cancelMode === 'conflict') return Response.json({ code: 'CONFLICT' }, { status: 409 });
      assignment = { ...assignment, status: 'CANCELLED', availability: 'CANCELLED' };
      return Response.json(assignment);
    }
    if (path.endsWith('/access-codes') && method === 'GET') return Response.json({ items: scenario === 'empty' ? [] : [code], nextCursor: null });
    if (path === `/api/v1/task-assignments/${assignment.id}` && method === 'GET') return Response.json(assignment);
    throw new Error('Unexpected synthetic request');
  };
  const api = createActivitiesApi(createHttpClient('http://synthetic.invalid', { getGeneration: () => 1, notify() {} }, fetcher));
  root.render(<main className="staff-content"><AssignmentDetail key={++sequence} api={api} group={group} assignmentId={assignment.id} actorId={group.teacherId} /></main>);
}
declare global {
  interface Window {
    assignmentTest: { mount: typeof mount; calls(): Call[]; cancel(mode: string): void; reveal(mode: string): void; release(): void };
  }
}
window.assignmentTest = { mount, calls: () => calls, cancel: mode => { cancelMode = mode; }, reveal: mode => { revealMode = mode; }, release: () => releaseReveal?.() };
mount();
