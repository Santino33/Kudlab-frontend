import type { ReactNode } from 'react';
import { useQuery } from '../../usuarios/hooks';
import { Loading } from '../../usuarios/shared';
import type { AuthController } from '../../../auth/controller.ts';
import type { StudentsApi } from '../../academico/students/api.ts';
import type { Student } from '../../academico/students/types.ts';
import type { Group } from '../../academico/groups/types.ts';
import type { TasksApi } from '../api.ts';
import type { ActivitiesApi } from './api.ts';
import type { Route } from '../../usuarios/navigation.ts';
import { ActivityFailure, ActivityHeading, Assignments, AssignmentDetail, SessionResults, StudentActivities } from './Activities';
import { SupervisedExecution } from './Execution';

export function ActivityRoutes({ api, studentsApi, tasksApi, route, group, access, actorId, runtimeOrigin }: {
  api: ActivitiesApi; studentsApi: StudentsApi; tasksApi: TasksApi; route: Route; group: Group; access: AuthController; actorId: string; runtimeOrigin: string;
}) {
  if (route.kind === 'assignments') return <Assignments {...{ api, studentsApi, tasksApi, group, actorId }} />;
  if (route.kind === 'assignmentDetail') return <AssignmentDetail {...{ api, group, actorId }} assignmentId={route.assignmentId} />;
  if (route.kind === 'supervisedExecution') return <AssignmentExecution {...{ api, studentsApi, group, actorId, access, runtimeOrigin }} assignmentId={route.assignmentId} recipientId={route.recipientId} />;
  if (route.kind !== 'studentActivities' && route.kind !== 'sessionResults' && route.kind !== 'submissionRecovery') return null;
  return <StudentContext studentsApi={studentsApi} group={group} studentId={route.studentId}>{student => route.kind === 'studentActivities' ? <StudentActivities {...{ api, studentsApi, group }} studentId={student.id} /> : route.kind === 'sessionResults' ? <SessionResults {...{ api, group, actorId }} studentId={student.id} sessionId={route.sessionId} /> : <RecoveryContext {...{ api, access, actorId, runtimeOrigin, group }} student={student} sessionId={route.sessionId} />}</StudentContext>;
}
function StudentContext({ studentsApi, group, studentId, children }: { studentsApi: StudentsApi; group: Group; studentId: string; children(student: Student): ReactNode }) {
  const q = useQuery(signal => studentsApi.detail(studentId, signal), studentId);
  if (!q.result) return <><ActivityHeading>Tareas digitales</ActivityHeading><Loading text="Comprobando estudiante y curso" /></>;
  if (q.result.kind !== 'success' || q.result.data.groupId !== group.id) return <ActivityFailure result={q.result} />;
  return children(q.result.data);
}
function AssignmentExecution({ api, studentsApi, group, actorId, access, runtimeOrigin, assignmentId, recipientId }: {
  api: ActivitiesApi; studentsApi: StudentsApi; group: Group; actorId: string; access: AuthController; runtimeOrigin: string; assignmentId: string; recipientId: string;
}) {
  const q = useQuery(signal => api.assignment(assignmentId, signal), assignmentId);
  const r = q.result?.kind === 'success' && q.result.data.groupId === group.id ? q.result.data.recipients.find(r => r.id === recipientId) : undefined;
  if (!q.result) return <><ActivityHeading>Actividad supervisada</ActivityHeading><Loading text="Comprobando destinatario" /></>;
  if (!r) return <ActivityFailure result={q.result} />;
  return <StudentContext studentsApi={studentsApi} group={group} studentId={r.studentId}>{s => <SupervisedExecution {...{ api, access, actorId, runtimeOrigin, recipientId }} groupId={group.id} studentId={s.id} studentName={`${s.firstName} ${s.lastName}`} />}</StudentContext>;
}
function RecoveryContext({ api, access, actorId, runtimeOrigin, group, student, sessionId }: {
  api: ActivitiesApi; access: AuthController; actorId: string; runtimeOrigin: string; group: Group; student: Student; sessionId: string;
}) {
  const q = useQuery(signal => api.session(sessionId, signal), sessionId);
  if (!q.result) return <><ActivityHeading>Recuperar envío</ActivityHeading><Loading text="Comprobando sesión" /></>;
  if (q.result.kind !== 'success' || q.result.data.studentId !== student.id || q.result.data.attemptNumber === null) return <ActivityFailure result={q.result} />;
  return <SupervisedExecution {...{ api, access, actorId, runtimeOrigin }} groupId={group.id} studentId={student.id} studentName={`${student.firstName} ${student.lastName}`} recoverySessionId={sessionId} />;
}
