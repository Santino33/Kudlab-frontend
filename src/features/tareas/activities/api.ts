import type { HttpClient } from '../../../lib/http.ts';
import { isId, object, parseAssignment, parseAssignmentSummary, parseGrant, parsePage, parseSession, parseSessionSummary, parseCode, parseRevealedCode, type Evidence } from './types.ts';
import type { HttpResult } from '../../usuarios/types.ts';

export type AssignmentInput = { requestId: string; taskId: 'TG-01'; publishedVersionId: string; groupId: string; studentIds: string[]; startsAt: string; endsAt: string; maxAttempts: number };
export function createActivitiesApi(http: HttpClient) {
  const request = <T>(path: string, signal: AbortSignal, decode: (value: unknown) => T | undefined, body?: unknown): Promise<HttpResult<T>> => {
    const resourceId = path.split('?')[0]!.split('/')[4], groupId = new URLSearchParams(path.split('?')[1]).get('groupId');
    if (resourceId && !isId(resourceId) || groupId && !isId(groupId)) return Promise.resolve({ kind: 'error', status: 404, code: 'NOT_FOUND', uncertain: false });
    return http.request(path, { signal, decode, localForbiddenCodes: ['PARTICIPATION_BLOCKED'], ...(body === undefined ? {} : { method: 'POST' as const, body }) });
  };
  const id = encodeURIComponent;
  const paging = (cursor?: string) => cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  return {
    codes: (assignmentId: string, signal: AbortSignal, cursor?: string) => request(`/api/v1/task-assignments/${id(assignmentId)}/access-codes?limit=100${paging(cursor)}`, signal, v => parsePage(v, parseCode)),
    generateCodes: (assignmentId: string, requestId: string, recipientIds: string[], signal: AbortSignal) => request(`/api/v1/task-assignments/${id(assignmentId)}/access-codes`, signal, v => {
      if (!object(v) || !Array.isArray(v.items) || !Number.isInteger(v.createdCount) || !Number.isInteger(v.reusedCount)) return;
      const items = v.items.map(parseCode); if (items.some(c => !c || !recipientIds.includes(c.recipientId)) || new Set(items.map(c => c!.id)).size !== recipientIds.length || new Set(items.map(c => c!.recipientId)).size !== recipientIds.length || Number(v.createdCount) < 0 || Number(v.reusedCount) < 0 || Number(v.createdCount) + Number(v.reusedCount) !== items.length) return;
      return { items: items.map(c => c!), createdCount: Number(v.createdCount), reusedCount: Number(v.reusedCount) };
    }, { requestId, recipientIds }),
    revealCode: (codeId: string, signal: AbortSignal) => request(`/api/v1/task-access-codes/${id(codeId)}/reveal`, signal, v => { const c = parseRevealedCode(v); return c?.codeId === codeId ? c : undefined; }, {}),
    replaceCode: (codeId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-access-codes/${id(codeId)}/replace`, signal, parseCode, { requestId }),
    revokeCode: (codeId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-access-codes/${id(codeId)}/revoke`, signal, v => { const c = parseCode(v); return c?.id === codeId ? c : undefined; }, { requestId }),
    recoveryCode: (sessionId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-sessions/${id(sessionId)}/access-recovery-codes`, signal, v => { const c = parseCode(v); return c?.sessionId === sessionId && c.scope === 'SUBMIT_ONLY' ? c : undefined; }, { requestId }),
    create: (input: AssignmentInput, signal: AbortSignal) => request('/api/v1/task-assignments', signal, parseAssignment, input),
    assignments: (groupId: string, signal: AbortSignal, cursor?: string) => request(`/api/v1/task-assignments?groupId=${id(groupId)}${paging(cursor)}`, signal, v => { const page = parsePage(v, parseAssignmentSummary); return page?.items.every(a => a.groupId === groupId) ? page : undefined; }),
    assignment: (assignmentId: string, signal: AbortSignal) => request(`/api/v1/task-assignments/${id(assignmentId)}`, signal, v => { const a = parseAssignment(v); return a?.id === assignmentId ? a : undefined; }),
    cancel: (assignmentId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-assignments/${id(assignmentId)}/cancel`, signal, parseAssignment, { requestId }),
    launch: (recipientId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-assignment-recipients/${id(recipientId)}/launch-grants`, signal, parseGrant, { requestId }),
    recover: (sessionId: string, submissionId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-sessions/${id(sessionId)}/recovery-grants`, signal, parseGrant, { requestId, submissionId }),
    sessions: (studentId: string, signal: AbortSignal, cursor?: string) => request(`/api/v1/students/${id(studentId)}/task-sessions?limit=25${paging(cursor)}`, signal, v => { const page = parsePage(v, parseSessionSummary); return page?.items.every(s => s.studentId === studentId) ? page : undefined; }),
    session: (sessionId: string, signal: AbortSignal) => request(`/api/v1/task-sessions/${id(sessionId)}`, signal, v => { const s = parseSession(v); return s?.id === sessionId ? s : undefined; }),
    evidence: (sessionId: string, kind: 'trials' | 'incidents', signal: AbortSignal, cursor?: string) => request(`/api/v1/task-sessions/${id(sessionId)}/evidence?kind=${kind}${paging(cursor)}`, signal, v => parsePage<Evidence>(v, x => object(x) && Number.isInteger(x[kind === 'trials' ? 'trial' : 'sequence']) ? x : undefined)),
    retry: (sessionId: string, requestId: string, signal: AbortSignal) => request(`/api/v1/task-sessions/${id(sessionId)}/processing-retries`, signal, v => object(v) && v.sessionId === sessionId && isId(v.runId) && v.processingStatus === 'PENDING' ? { sessionId, runId: v.runId, processingStatus: 'PENDING' as const } : undefined, { requestId }),
  };
}
export type ActivitiesApi = ReturnType<typeof createActivitiesApi>;
