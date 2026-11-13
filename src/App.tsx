import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createConsentsApi, consentAccess } from './features/academico/consents/api.ts';
import { createStudentDraftHost } from './features/academico/students/student-drafts.ts';
import type { StudentDraftHost } from './features/academico/students/student-drafts.ts';
import { operationHandle } from './features/academico/consents/operation-handle.ts';
import { createTasksApi } from './features/tareas/api.ts';
import { createStudentsApi } from './features/academico/students/api.ts';
import { createGroupsApi } from './features/academico/groups/api.ts';
import type { GroupWrite } from './features/academico/groups/api.ts';
import { Groups, GroupContent, GroupAdministration, GroupForm, GroupWriteNotice } from './features/academico/groups/Groups';
import { Registration } from './features/academico/students/Registration';
import type { StudentWrite } from './features/academico/students/api.ts';
import { Students, StudentDetail, StudentEdit, StudentRegistration, StudentWriteNotice } from './features/academico/students/Students';
import { Catalog, TaskDetail } from './features/tareas/Catalog';
import { AuthRoot } from './auth/AuthRoot.tsx';
import type { AuthController } from './auth/controller.ts';
import { createAuthController } from './auth/controller.ts';
import { createAuthClient } from './auth/client.ts';
import { Alert, AlertDescription } from './components/ui/alert';
import { Card, CardContent, CardHeader } from './components/ui/card';
import { canConsultTasks, canManageAccounts, canManageStudents, resolveRoute, routeTitles, workspaceNavigation } from './features/usuarios/navigation.ts';
import type { captureEntry } from './features/usuarios/navigation.ts';
import { AcceptInvitation } from './features/usuarios/invitations/AcceptInvitation';
import { StaffLayout } from './components/StaffLayout';
import { createHttpClient } from './lib/http.ts';
import { invalidateNavigation, startNavigation } from './lib/navigation.ts';
import { createUsuariosApi } from './features/usuarios/api.ts';
import { Dashboard, Workspace } from './features/usuarios/workspace/Workspace';
import { Accounts } from './features/usuarios/accounts/Accounts';
import { AccountDetail } from './features/usuarios/accounts/AccountDetail';
import { AccountForm } from './features/usuarios/accounts/AccountForm';
import { Recovery } from './features/usuarios/recovery/Recovery';
import { Notice } from './features/usuarios/shared';
import { createIndicatorsApi } from './features/indicadores/api.ts';
import { createObservationsApi } from './features/seguimiento/observations/api.ts';
import { createNotesApi, localNotesAccess } from './features/academico/notes/api.ts';
import { createAnnotationsApi, localAnnotationsAccess } from './features/seguimiento/annotations/api.ts';
import { ObservationMatrixRoute } from './features/seguimiento/observations/ObservationMatrixRoute';
import { IndicatorCatalog } from './features/indicadores/IndicatorCatalog';
import { IndicatorDefinitionView } from './features/indicadores/IndicatorDefinitionView';
import { StudentIndicatorsRoute } from './features/indicadores/StudentIndicatorsRoute';
import { Button } from './components/ui/button';
import { createActivitiesApi } from './features/tareas/activities/api.ts';
import { ActivityRoutes } from './features/tareas/activities/ActivityRoutes';

function DestinationNotice({ blocked = false, denied = false }: { blocked?: boolean; denied?: boolean }) {
  return <Card>
    <CardHeader><h1 id="auth-title" className="auth-heading" tabIndex={-1}>
      {blocked ? 'Enlace no disponible' : denied ? 'No tienes acceso a este destino' : 'Destino no disponible'}
    </h1></CardHeader>
    <CardContent>
      <Alert><AlertDescription>{blocked ?
        'No podemos identificar un trámite utilizable con este enlace. No se ha realizado ninguna operación.' :
        denied ? 'El servidor no ha autorizado este destino con tu acceso actual.' :
        'Este destino no está disponible en esta versión.'}</AlertDescription></Alert>
      <a className="staff-link" href={blocked ? '/acceso' : '/'}>{blocked ? 'Ir al acceso' : 'Volver al inicio'}</a>
    </CardContent>
  </Card>;
}

export function App({ controller: injected, apiOrigin, pathname = window.location.pathname, search = window.location.search, initialEntry, fetcher = globalThis.fetch }: {
  controller?: AuthController; apiOrigin?: string; pathname?: string; search?: string;
  initialEntry?: ReturnType<typeof captureEntry>; fetcher?: typeof fetch;
}) {
  const [entry] = useState(() => initialEntry ?? { route: resolveRoute(pathname, search), recovery: { read: () => undefined, clear() {} }, invitation: { read: () => undefined, clear() {} } });
  const [route, setRoute] = useState(entry.route);
  useLayoutEffect(() => { if (route.kind !== 'invitationAccept') entry.invitation.clear(); }, [entry, route.kind]);
  const drafts = useRef<StudentDraftHost | undefined>(undefined);
  const draftOrigin = useRef(apiOrigin);
  if (draftOrigin.current !== apiOrigin) { drafts.current?.discard(); operationHandle(sessionStorage).clear(); draftOrigin.current = apiOrigin; }
  const selection = (r: typeof route) => r.kind === 'studentDetail' ? `student:${r.studentId}:${r.groupId ?? ''}` : r.kind === 'observationMatrix' ? `matrix:${r.groupId}` : '';
  const selected = useRef(selection(route));
  // T-15 must publish only confirmed routes; a cancelled attempt must never reach this commit.
  useLayoutEffect(() => {
    const key = selection(route);
    if (key !== selected.current) { drafts.current?.discard(); operationHandle(sessionStorage).clear(); selected.current = key; }
  }, [route]);
  useLayoutEffect(() => startNavigation(
    () => setRoute(resolveRoute(window.location.pathname, window.location.search)),
    (from, to) => selection(resolveRoute(from.pathname, from.search)) === selection(resolveRoute(to.pathname, to.search)),
  ), []);
  useEffect(() => {
    document.getElementById('auth-title')?.focus();
    document.title = `${routeTitles[route.kind]} · Kudlab`;
  }, [route]);
  const [uncertain, setUncertain] = useState(false);
  const [studentWrite, setStudentWrite] = useState<StudentWrite>();
  const [groupWrite, setGroupWrite] = useState<GroupWrite>();
  const [controller] = useState(() => {
    if (injected) return injected;
    try { return createAuthController(createAuthClient(apiOrigin ?? '', (url, init) => fetcher(url, init))); }
    catch { return undefined; }
  });
  if (controller && !drafts.current) drafts.current = createStudentDraftHost(controller);
  const suspendDrafts = useCallback(() => drafts.current?.suspend(), []);
  useEffect(() => {
    if (!controller) return;
    const sync = () => {
      drafts.current?.sync();
      const state = controller.getSnapshot();
      if (state.kind !== 'authenticated' || state.denied || state.user.role !== 'TEACHER') invalidateNavigation();
      if (['signedOut', 'signingIn', 'signingOut', 'signOutUnconfirmed'].includes(state.kind) ||
        state.kind === 'authenticated' && (state.denied || state.user.role !== 'TEACHER') ||
        (state.kind === 'checking' || state.kind === 'checkUnavailable') && state.context === 'denied') operationHandle(sessionStorage).clear();
    };
    sync(); return controller.subscribe(sync);
  }, [controller]);
  const apis = useMemo(() => {
    if (!controller || !apiOrigin) return;
    try {
      const studentHttp = createHttpClient(apiOrigin, controller, fetcher, () => setStudentWrite(state => state ? { ...state, phase: 'uncertain' } : state));
      const readHttp = createHttpClient(apiOrigin, consentAccess(controller), fetcher);
      const groupRead = createGroupsApi(readHttp);
      return {
       consents: createConsentsApi(apiOrigin, controller, fetcher),
       observations: createObservationsApi(apiOrigin, controller, fetcher),
        notes: createNotesApi(createHttpClient(apiOrigin, localNotesAccess(controller), fetcher)),
        annotations: createAnnotationsApi(createHttpClient(apiOrigin, localAnnotationsAccess(controller), fetcher)),
       matrixGroups: groupRead,
       academicRead: createStudentsApi(readHttp),
       academicForGroup: (id: string) => createStudentsApi(readHttp, undefined, id),
       indicators: createIndicatorsApi(readHttp),
       groupsRead: { ...groupRead, async detail(...args: Parameters<typeof groupRead.detail>) {
         const captured = drafts.current?.capture();
         const result = await groupRead.detail(...args);
         const current = drafts.current?.capture();
         if (captured?.epoch === current?.epoch && captured?.generation === current?.generation &&
           result.kind === 'error' && [401, 403, 404].includes(result.status)) { drafts.current?.discard(); operationHandle(sessionStorage).clear(); }
         return result;
       } },
      accounts: createUsuariosApi(createHttpClient(apiOrigin, controller, fetcher, () => setUncertain(true))),
      tasks: createTasksApi(createHttpClient(apiOrigin, controller, fetcher)),
      activities: createActivitiesApi(createHttpClient(apiOrigin, controller, fetcher)),
      students: createStudentsApi(studentHttp, setStudentWrite),
      studentsForGroup: (id: string) => createStudentsApi(studentHttp, setStudentWrite, id),
      groups: createGroupsApi(createHttpClient(apiOrigin, controller, fetcher), setGroupWrite),
      recovery: createUsuariosApi(createHttpClient(apiOrigin, { getGeneration: controller.getGeneration, notify() {} }, fetcher)),
    }; } catch { return; }
  }, [controller, apiOrigin, fetcher]);
  if (route.kind === 'blockedLink' || route.kind === 'unavailable') {
    return <StaffLayout><section className="auth-content" aria-labelledby="auth-title">
      <DestinationNotice blocked={route.kind === 'blockedLink'} />
    </section></StaffLayout>;
  }
  if (!controller || !apis) {
    return <StaffLayout><section className="auth-content" aria-labelledby="auth-title"><Card>
      <CardHeader><h1 id="auth-title" className="auth-heading">Acceso no disponible</h1></CardHeader>
      <CardContent><Alert><AlertDescription>No se ha configurado un origen válido para la API. Solicita al responsable que revise la configuración.</AlertDescription></Alert></CardContent>
    </Card></section></StaffLayout>;
  }
  if (route.kind === 'invitationAccept') {
    return <AuthRoot controller={controller} onSuspend={entry.invitation.clear} publicContent={() =>
      <AcceptInvitation api={apis.recovery} ticket={entry.invitation} />} />;
  }
  if (route.kind === 'recoveryRequest' || route.kind === 'recoveryConfirm') {
    return <AuthRoot controller={controller} onSuspend={entry.recovery.clear} publicContent={() =>
      <Recovery api={apis.recovery} confirm={route.kind === 'recoveryConfirm'} ticket={entry.recovery} />} />;
  }
  const management = ['accounts', 'invite', 'detail', 'edit'].includes(route.kind);
  const tasks = route.kind === 'tasks' || route.kind === 'taskDetail';
  const students = ['students', 'studentNew', 'studentDetail', 'studentEdit', 'observationMatrix'].includes(route.kind);
  const indicators = ['indicatorCatalog', 'indicatorDetail', 'studentIndicators'].includes(route.kind);
  const courses = ['groups', 'groupNew', 'groupDetail', 'groupEdit'].includes(route.kind);
  const activities = ['assignments', 'assignmentDetail', 'supervisedExecution', 'studentActivities', 'sessionResults', 'submissionRecovery'].includes(route.kind);
  const selectedGroup = 'groupId' in route ? route.groupId : undefined;
  return <AuthRoot controller={controller} onSuspend={suspendDrafts} notice={uncertain ? <Notice title="Hay una operación sin confirmar">
    <p>No la repitas sin revisar el estado actual de la cuenta. El fallo no demuestra que se haya deshecho.</p>
    <Button variant="outline" className="mt-4" onClick={() => setUncertain(false)}>Ya revisé el estado actual</Button>
  </Notice> : undefined} renderAuthenticated={
    (user, access, generation) => <Workspace user={user} navigation={workspaceNavigation(route, user.role, !canConsultTasks(access.getSnapshot()))} signOut={access.signOut}>
      {groupWrite && <div className="mb-6"><GroupWriteNotice write={groupWrite} /></div>}
      {studentWrite && canManageStudents(access.getSnapshot()) && <div className="mb-6"><StudentWriteNotice write={studentWrite} /></div>}
      <div key={`${generation}:${route.kind}:${selectedGroup ?? ''}:${'studentId' in route ? route.studentId : 'accountId' in route ? route.accountId : route.kind === 'taskDetail' ? route.taskId : ''}:${'sessionId' in route ? route.sessionId : ''}:${'assignmentId' in route ? route.assignmentId : ''}:${'recipientId' in route ? route.recipientId : ''}`}>{(management && !canManageAccounts(access.getSnapshot())) || (tasks && !canConsultTasks(access.getSnapshot())) || ((students || activities) && !canManageStudents(access.getSnapshot())) || (courses && !canConsultTasks(access.getSnapshot())) || (['groupNew', 'groupEdit'].includes(route.kind) && !canManageAccounts(access.getSnapshot())) ? <DestinationNotice denied /> :
        indicators && !canManageStudents(access.getSnapshot()) ? <Notice title="Sección no disponible"><p>Los indicadores están disponibles para el personal docente.</p></Notice> :
        route.kind === 'indicatorCatalog' ? <IndicatorCatalog api={apis.indicators} /> :
        route.kind === 'indicatorDetail' ? <IndicatorDefinitionView api={apis.indicators} metricCode={route.metricCode} taskId={route.taskId} /> :
        route.kind === 'studentIndicators' ? <GroupContent api={apis.groupsRead} groupId={route.groupId}>{group => <StudentIndicatorsRoute api={apis.indicators} studentsApi={apis.academicRead} group={group} studentId={route.studentId} />}</GroupContent> :
        route.kind === 'observationMatrix' ? <GroupContent api={apis.groupsRead} groupId={route.groupId}>{() => <ObservationMatrixRoute api={apis.observations} groups={apis.matrixGroups} students={apis.academicForGroup(route.groupId)} consents={apis.consents} drafts={drafts.current!} apiOrigin={apiOrigin!} actorId={user.id} groupId={route.groupId} isCurrentSelection={() => draftOrigin.current === apiOrigin && selected.current === selection(route)} />}</GroupContent> :
        activities && selectedGroup ? <GroupContent api={apis.groups} groupId={selectedGroup}>{group => <ActivityRoutes api={apis.activities} studentsApi={apis.studentsForGroup(group.id)} tasksApi={apis.tasks} route={route} group={group} access={access} actorId={user.id} runtimeOrigin={import.meta.env.VITE_PLAY_ORIGIN ?? ''} />}</GroupContent> :
        route.kind === 'groups' ? <Groups api={apis.groups} admin={user.role === 'ADMIN'} write={groupWrite} reviewed={() => setGroupWrite(undefined)} /> :
        route.kind === 'groupNew' ? <GroupForm api={apis.groups} locked={Boolean(groupWrite)} /> :
        route.kind === 'groupEdit' ? <GroupContent api={apis.groups} groupId={route.groupId}>{group => <GroupForm api={apis.groups} before={group} locked={Boolean(groupWrite)} />}</GroupContent> :
        route.kind === 'groupDetail' ? <GroupContent api={apis.groups} groupId={route.groupId}>{group => user.role === 'ADMIN' ? <GroupAdministration group={group} api={apis.groups} locked={Boolean(groupWrite)} /> : <Students group={group} api={apis.studentsForGroup(group.id)} write={studentWrite} reviewed={() => setStudentWrite(undefined)} />}</GroupContent> :
        students && selectedGroup ? <GroupContent api={route.kind === 'studentDetail' ? apis.groupsRead : apis.groups} groupId={selectedGroup}>{group => route.kind === 'studentNew' ? <Registration group={group} api={apis.studentsForGroup(group.id)} locked={Boolean(studentWrite)} /> : route.kind === 'studentDetail' ? <StudentDetail group={group} api={apis.studentsForGroup(group.id)} readApi={apis.academicRead} consents={apis.consents} observations={apis.observations} notes={apis.notes} annotations={apis.annotations} drafts={drafts.current!} actorId={user.id} apiOrigin={apiOrigin!} activities={apis.activities} studentId={route.studentId} write={studentWrite} reviewed={() => setStudentWrite(undefined)} /> : route.kind === 'studentEdit' ? <StudentEdit group={group} api={apis.studentsForGroup(group.id)} studentId={route.studentId} locked={Boolean(studentWrite)} /> : <Students group={group} api={apis.studentsForGroup(group.id)} />}</GroupContent> :
        route.kind === 'students' ? <Students api={apis.students} /> :
        route.kind === 'studentNew' ? <StudentRegistration /> :
        route.kind === 'studentDetail' ? <StudentDetail api={apis.students} readApi={apis.academicRead} consents={apis.consents} observations={apis.observations} notes={apis.notes} annotations={apis.annotations} drafts={drafts.current!} actorId={user.id} apiOrigin={apiOrigin!} activities={apis.activities} studentId={route.studentId} write={studentWrite} reviewed={() => setStudentWrite(undefined)} /> :
        route.kind === 'studentEdit' ? <StudentEdit api={apis.students} studentId={route.studentId} locked={Boolean(studentWrite)} /> :
        route.kind === 'tasks' ? <Catalog api={apis.tasks} admin={user.role === 'ADMIN'} /> :
        route.kind === 'taskDetail' ? <TaskDetail key={route.taskId} api={apis.tasks} taskId={route.taskId} admin={user.role === 'ADMIN'} /> :
        route.kind === 'accounts' ? <Accounts api={apis.accounts} /> :
        route.kind === 'invite' ? <AccountForm api={apis.accounts} locked={uncertain} /> :
        route.kind === 'detail' ? <AccountDetail api={apis.accounts} accountId={route.accountId} revalidate={access.revalidate} locked={uncertain} /> :
        route.kind === 'edit' ? <AccountForm api={apis.accounts} accountId={route.accountId} locked={uncertain} /> : <Dashboard user={user} />}</div>
    </Workspace>} />;
}
