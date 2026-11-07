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
import { Notice } from '../../usuarios/shared';
import { ActivityFailure, ActivityHeading, ActivityLink, Assignments, AssignmentDetail, SessionResults, StudentActivities } from './Activities';
import { SubmissionRecovery } from './Execution';
import { assignmentPath } from './types.ts';

export function ActivityRoutes({ api, studentsApi, tasksApi, route, group, access, actorId, runtimeOrigin }: {
  api: ActivitiesApi; studentsApi: StudentsApi; tasksApi: TasksApi; route: Route; group: Group; access: AuthController; actorId: string; runtimeOrigin: string;
}) {
  if (route.kind === 'assignments') return <Assignments {...{ api, studentsApi, tasksApi, group, actorId }} />;
  if (route.kind === 'assignmentDetail') return <AssignmentDetail {...{ api, group, actorId }} assignmentId={route.assignmentId} />;
  // Old supervised-start URLs: the game no longer runs inside the teacher frontend. No iframe, grant or attempt.
  if (route.kind === 'supervisedExecution') return <div className="staff-stack"><ActivityHeading>La actividad se realiza en Kudlab Play</ActivityHeading>
    <Notice title="Inicio desde el espacio docente retirado"><p>El estudiante comienza la actividad en Kudlab Play con su código. Desde aquí puedes consultar y gestionar los códigos de la asignación.</p></Notice>
    <ActivityLink href={assignmentPath(group.id, route.assignmentId)}>Volver a la asignación</ActivityLink></div>;
  if (route.kind !== 'studentActivities' && route.kind !== 'sessionResults' && route.kind !== 'submissionRecovery') return null;
  return <StudentContext studentsApi={studentsApi} group={group} studentId={route.studentId}>{student => route.kind === 'studentActivities' ? <StudentActivities {...{ api, studentsApi, group }} studentId={student.id} /> : route.kind === 'sessionResults' ? <SessionResults {...{ api, group, actorId }} studentId={student.id} sessionId={route.sessionId} /> : <RecoveryContext {...{ api, access, actorId, runtimeOrigin, group }} student={student} sessionId={route.sessionId} />}</StudentContext>;
}
function StudentContext({ studentsApi, group, studentId, children }: { studentsApi: StudentsApi; group: Group; studentId: string; children(student: Student): ReactNode }) {
  const q = useQuery(signal => studentsApi.detail(studentId, signal), studentId);
  if (!q.result) return <><ActivityHeading>Tareas digitales</ActivityHeading><Loading text="Comprobando estudiante y curso" /></>;
  if (q.result.kind !== 'success' || q.result.data.groupId !== group.id) return <ActivityFailure result={q.result} />;
  return children(q.result.data);
}
function RecoveryContext({ api, access, actorId, runtimeOrigin, group, student, sessionId }: {
  api: ActivitiesApi; access: AuthController; actorId: string; runtimeOrigin: string; group: Group; student: Student; sessionId: string;
}) {
  const q = useQuery(signal => api.session(sessionId, signal), sessionId);
  if (!q.result) return <><ActivityHeading>Recuperar envío</ActivityHeading><Loading text="Comprobando sesión" /></>;
  if (q.result.kind !== 'success' || q.result.data.studentId !== student.id || q.result.data.attemptNumber === null) return <ActivityFailure result={q.result} />;
  return <SubmissionRecovery {...{ api, access, actorId, runtimeOrigin }} groupId={group.id} studentId={student.id} studentName={`${student.firstName} ${student.lastName}`} recoverySessionId={sessionId} />;
}
