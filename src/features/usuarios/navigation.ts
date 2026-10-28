import type { AccessState } from '../../auth/state.ts';

export const canManageAccounts = (state: AccessState) => state.kind === 'authenticated' && state.user.role === 'ADMIN' && !state.denied;
export const canConsultTasks = (state: AccessState) => state.kind === 'authenticated' && !state.denied;
export const canManageStudents = (state: AccessState) => state.kind === 'authenticated' && state.user.role === 'TEACHER' && !state.denied;

export type Route =
  | { kind: 'entry' | 'access' | 'accounts' | 'invite' | 'recoveryRequest' |
      'recoveryConfirm' | 'unavailable' | 'blockedLink' | 'tasks' | 'groups' | 'groupNew' }
  | { kind: 'students' | 'studentNew'; groupId?: string }
  | { kind: 'studentDetail' | 'studentEdit'; studentId: string; groupId?: string }
  | { kind: 'groupDetail' | 'groupEdit'; groupId: string }
  | { kind: 'taskDetail'; taskId: string }
  | { kind: 'assignments'; groupId: string }
  | { kind: 'assignmentDetail'; groupId: string; assignmentId: string }
  | { kind: 'supervisedExecution'; groupId: string; assignmentId: string; recipientId: string }
  | { kind: 'studentActivities'; groupId: string; studentId: string }
  | { kind: 'sessionResults' | 'submissionRecovery'; groupId: string; studentId: string; sessionId: string }
  | { kind: 'detail' | 'edit'; accountId: string };

export const routeTitles: Record<Route['kind'], string> = {
  entry: 'Inicio', access: 'Acceso', accounts: 'Profesores', invite: 'Invitar profesor',
  detail: 'Cuenta de profesor', edit: 'Editar cuenta', recoveryRequest: 'Recuperar contraseña',
  recoveryConfirm: 'Nueva contraseña', unavailable: 'Página no disponible', blockedLink: 'Enlace no disponible',
  tasks: 'Tareas digitales', taskDetail: 'Ficha de tarea', students: 'Estudiantes',
  studentNew: 'Registrar estudiante', studentDetail: 'Ficha de estudiante', studentEdit: 'Editar estudiante',
  groups: 'Mis cursos', groupNew: 'Crear curso', groupDetail: 'Curso', groupEdit: 'Editar curso',
  assignments: 'Asignaciones', assignmentDetail: 'Estudiantes y códigos', supervisedExecution: 'Actividad supervisada',
  studentActivities: 'Tareas del estudiante', sessionResults: 'Detalle de sesión', submissionRecovery: 'Recuperar envío',
};

export function resolveRoute(pathname: string, search: string): Route {
  if (new URLSearchParams(search).has('token') && pathname !== '/recuperar-acceso/confirmar') {
    return { kind: 'blockedLink' };
  }
  switch (pathname) {
    case '/': return { kind: 'entry' };
    case '/acceso': return { kind: 'access' };
    case '/usuarios': return { kind: 'accounts' };
    case '/tareas': return { kind: 'tasks' };
    case '/academico/cursos': return { kind: 'groups' };
    case '/academico/cursos/nuevo': return { kind: 'groupNew' };
    case '/academico/estudiantes': return { kind: 'students' };
    case '/academico/estudiantes/nuevo': return { kind: 'studentNew' };
    case '/usuarios/nueva': return { kind: 'invite' };
    case '/recuperar-acceso': return { kind: 'recoveryRequest' };
    case '/recuperar-acceso/confirmar': return { kind: 'recoveryConfirm' };
  }
  const activity = /^\/academico\/cursos\/([0-9a-f-]{36})\/(?:asignaciones(?:\/([0-9a-f-]{36})(?:\/destinatarios\/([0-9a-f-]{36})\/ejecucion)?)?|estudiantes\/([0-9a-f-]{36})\/tareas(?:\/([0-9a-f-]{36})(\/recuperacion)?)?)$/.exec(pathname);
  if (activity) {
    const [, groupId, assignmentId, recipientId, studentId, sessionId, recovery] = activity;
    if (studentId) return sessionId ? { kind: recovery ? 'submissionRecovery' : 'sessionResults', groupId: groupId!, studentId, sessionId } : { kind: 'studentActivities', groupId: groupId!, studentId };
    return assignmentId ? recipientId ? { kind: 'supervisedExecution', groupId: groupId!, assignmentId, recipientId } : { kind: 'assignmentDetail', groupId: groupId!, assignmentId } : { kind: 'assignments', groupId: groupId! };
  }
  const course = /^\/academico\/cursos\/([^/]+)(?:\/(editar|estudiantes\/nuevo|estudiantes\/([^/]+)(\/editar)?))?$/.exec(pathname);
  if (course) {
    try {
      const groupId = decodeURIComponent(course[1]);
      if (!course[2]) return { kind: 'groupDetail', groupId };
      if (course[2] === 'editar') return { kind: 'groupEdit', groupId };
      if (course[2] === 'estudiantes/nuevo') return { kind: 'studentNew', groupId };
      return { kind: course[4] ? 'studentEdit' : 'studentDetail', groupId, studentId: decodeURIComponent(course[3]) };
    } catch { return { kind: 'unavailable' }; }
  }
  const studentMatch = /^\/academico\/estudiantes\/([^/]+)(\/editar)?$/.exec(pathname);
  if (studentMatch) {
    let studentId = '';
    try { studentId = decodeURIComponent(studentMatch[1]); } catch { /* Neutral not-found page. */ }
    return { kind: studentMatch[2] ? 'studentEdit' : 'studentDetail', studentId };
  }
  if (pathname.startsWith('/tareas/')) {
    try { return { kind: 'taskDetail', taskId: decodeURIComponent(pathname.slice('/tareas/'.length)) }; }
    catch { return { kind: 'taskDetail', taskId: '' }; }
  }
  const match = /^\/usuarios\/([^/]+)(\/editar)?$/.exec(pathname);
  if (match) {
    try {
      const accountId = decodeURIComponent(match[1]);
      if (accountId && !/[/?#\\]/.test(accountId) && !['.', '..'].includes(accountId)) {
        return { kind: match[2] ? 'edit' : 'detail', accountId };
      }
    } catch { /* Malformed paths must not become requests. */ }
  }
  return { kind: 'unavailable' };
}

export type RecoveryTicket = { read(): string | undefined; clear(): void };
export function captureEntry(location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  history: Pick<History, 'replaceState'>): { route: Route; recovery: RecoveryTicket } {
  const route = resolveRoute(location.pathname, location.search);
  const params = new URLSearchParams(location.search);
  const values = params.getAll('token');
  let token = route.kind === 'recoveryConfirm' && values.length === 1 && values[0] ? values[0] : undefined;
  if (params.has('token')) history.replaceState(null, '', location.pathname);
  return { route, recovery: { read: () => token, clear: () => { token = undefined; } } };
}
