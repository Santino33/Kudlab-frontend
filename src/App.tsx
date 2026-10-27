import { useEffect, useMemo, useState } from 'react';
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
import { canConsultTasks, canManageAccounts, canManageStudents, resolveRoute, routeTitles } from './features/usuarios/navigation.ts';
import type { captureEntry } from './features/usuarios/navigation.ts';
import { StaffLayout } from './components/StaffLayout';
import { createHttpClient } from './lib/http.ts';
import { createUsuariosApi } from './features/usuarios/api.ts';
import { Dashboard, Workspace } from './features/usuarios/workspace/Workspace';
import { Accounts } from './features/usuarios/accounts/Accounts';
import { AccountDetail } from './features/usuarios/accounts/AccountDetail';
import { AccountForm } from './features/usuarios/accounts/AccountForm';
import { Recovery } from './features/usuarios/recovery/Recovery';
import { Notice } from './features/usuarios/shared';
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
  const [entry] = useState(() => initialEntry ?? { route: resolveRoute(pathname, search), recovery: { read: () => undefined, clear() {} } });
  const [route, setRoute] = useState(entry.route);
  useEffect(() => {
    const changed = () => setRoute(resolveRoute(window.location.pathname, window.location.search));
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
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
  const apis = useMemo(() => {
    if (!controller || !apiOrigin) return;
    try {
      const studentHttp = createHttpClient(apiOrigin, controller, fetcher, () => setStudentWrite(state => state ? { ...state, phase: 'uncertain' } : state));
      return {
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
  if (route.kind === 'recoveryRequest' || route.kind === 'recoveryConfirm') {
    return <AuthRoot controller={controller} onSuspend={entry.recovery.clear} publicContent={() =>
      <Recovery api={apis.recovery} confirm={route.kind === 'recoveryConfirm'} ticket={entry.recovery} />} />;
  }
  const management = ['accounts', 'invite', 'detail', 'edit'].includes(route.kind);
  const tasks = route.kind === 'tasks' || route.kind === 'taskDetail';
  const students = ['students', 'studentNew', 'studentDetail', 'studentEdit'].includes(route.kind);
  const courses = ['groups', 'groupNew', 'groupDetail', 'groupEdit'].includes(route.kind);
  const activities = ['assignments', 'assignmentDetail', 'supervisedExecution', 'studentActivities', 'sessionResults', 'submissionRecovery'].includes(route.kind);
  const selectedGroup = 'groupId' in route ? route.groupId : undefined;
  return <AuthRoot controller={controller} notice={uncertain ? <Notice title="Hay una operación sin confirmar">
    <p>No la repitas sin revisar el estado actual de la cuenta. El fallo no demuestra que se haya deshecho.</p>
    <Button variant="outline" className="mt-4" onClick={() => setUncertain(false)}>Ya revisé el estado actual</Button>
  </Notice> : undefined} renderAuthenticated={
    (user, access, generation) => <Workspace user={user} section={students || courses || activities ? 'groups' : tasks ? 'tasks' : route.kind === 'invite' ? 'invite' : management ? 'accounts' : 'home'} signOut={access.signOut}>
      {groupWrite && <div className="mb-6"><GroupWriteNotice write={groupWrite} /></div>}
      {studentWrite && canManageStudents(access.getSnapshot()) && <div className="mb-6"><StudentWriteNotice write={studentWrite} /></div>}
      <div key={`${generation}:${route.kind}:${selectedGroup ?? ''}:${'studentId' in route ? route.studentId : 'accountId' in route ? route.accountId : route.kind === 'taskDetail' ? route.taskId : ''}:${'sessionId' in route ? route.sessionId : ''}:${'assignmentId' in route ? route.assignmentId : ''}:${'recipientId' in route ? route.recipientId : ''}`}>{(management && !canManageAccounts(access.getSnapshot())) || (tasks && !canConsultTasks(access.getSnapshot())) || ((students || activities) && !canManageStudents(access.getSnapshot())) || (courses && !canConsultTasks(access.getSnapshot())) || (['groupNew', 'groupEdit'].includes(route.kind) && !canManageAccounts(access.getSnapshot())) ? <DestinationNotice denied /> :
        activities && selectedGroup ? <GroupContent api={apis.groups} groupId={selectedGroup}>{group => <ActivityRoutes api={apis.activities} studentsApi={apis.studentsForGroup(group.id)} tasksApi={apis.tasks} route={route} group={group} access={access} actorId={user.id} runtimeOrigin={import.meta.env.VITE_PLAY_ORIGIN ?? ''} />}</GroupContent> :
        route.kind === 'groups' ? <Groups api={apis.groups} admin={user.role === 'ADMIN'} write={groupWrite} reviewed={() => setGroupWrite(undefined)} /> :
        route.kind === 'groupNew' ? <GroupForm api={apis.groups} locked={Boolean(groupWrite)} /> :
        route.kind === 'groupEdit' ? <GroupContent api={apis.groups} groupId={route.groupId}>{group => <GroupForm api={apis.groups} before={group} locked={Boolean(groupWrite)} />}</GroupContent> :
        route.kind === 'groupDetail' ? <GroupContent api={apis.groups} groupId={route.groupId}>{group => user.role === 'ADMIN' ? <GroupAdministration group={group} api={apis.groups} locked={Boolean(groupWrite)} /> : <Students group={group} api={apis.studentsForGroup(group.id)} write={studentWrite} reviewed={() => setStudentWrite(undefined)} />}</GroupContent> :
        students && selectedGroup ? <GroupContent api={apis.groups} groupId={selectedGroup}>{group => route.kind === 'studentNew' ? <Registration group={group} api={apis.studentsForGroup(group.id)} locked={Boolean(studentWrite)} /> : route.kind === 'studentDetail' ? <StudentDetail group={group} api={apis.studentsForGroup(group.id)} studentId={route.studentId} write={studentWrite} reviewed={() => setStudentWrite(undefined)} /> : route.kind === 'studentEdit' ? <StudentEdit group={group} api={apis.studentsForGroup(group.id)} studentId={route.studentId} locked={Boolean(studentWrite)} /> : <Students group={group} api={apis.studentsForGroup(group.id)} />}</GroupContent> :
        route.kind === 'students' ? <Students api={apis.students} /> :
        route.kind === 'studentNew' ? <StudentRegistration /> :
        route.kind === 'studentDetail' ? <StudentDetail api={apis.students} studentId={route.studentId} write={studentWrite} reviewed={() => setStudentWrite(undefined)} /> :
        route.kind === 'studentEdit' ? <StudentEdit api={apis.students} studentId={route.studentId} locked={Boolean(studentWrite)} /> :
        route.kind === 'tasks' ? <Catalog api={apis.tasks} /> :
        route.kind === 'taskDetail' ? <TaskDetail api={apis.tasks} taskId={route.taskId} /> :
        route.kind === 'accounts' ? <Accounts api={apis.accounts} /> :
        route.kind === 'invite' ? <AccountForm api={apis.accounts} locked={uncertain} /> :
        route.kind === 'detail' ? <AccountDetail api={apis.accounts} accountId={route.accountId} revalidate={access.revalidate} locked={uncertain} /> :
        route.kind === 'edit' ? <AccountForm api={apis.accounts} accountId={route.accountId} locked={uncertain} /> : <Dashboard user={user} />}</div>
    </Workspace>} />;
}
