import type { AccessState, Identity } from '../../auth/state.ts';
import { indicatorRouteTitles, resolveIndicatorRoute, type IndicatorRoute } from '../indicadores/routes.ts';
import { resolveObservationMatrix } from '../seguimiento/observations/navigation.ts';

export const canManageAccounts = (state: AccessState) => state.kind === 'authenticated' && state.user.role === 'ADMIN' && !state.denied;
export const canConsultTasks = (state: AccessState) => state.kind === 'authenticated' && !state.denied;
export const canManageStudents = (state: AccessState) => state.kind === 'authenticated' && state.user.role === 'TEACHER' && !state.denied;

export type Route =
  | { kind: 'entry' | 'access' | 'accounts' | 'invite' | 'recoveryRequest' |
      'recoveryConfirm' | 'invitationAccept' | 'unavailable' | 'blockedLink' | 'tasks' | 'groups' | 'groupNew' }
  | { kind: 'students' | 'studentNew'; groupId?: string }
  | { kind: 'studentDetail' | 'studentEdit'; studentId: string; groupId?: string }
  | { kind: 'groupDetail' | 'groupEdit'; groupId: string }
  | { kind: 'observationMatrix'; groupId: string }
  | { kind: 'taskDetail'; taskId: string }
  | { kind: 'assignments'; groupId: string }
  | { kind: 'assignmentDetail'; groupId: string; assignmentId: string }
  | { kind: 'supervisedExecution'; groupId: string; assignmentId: string; recipientId: string }
  | { kind: 'studentActivities'; groupId: string; studentId: string }
  | { kind: 'sessionResults' | 'submissionRecovery'; groupId: string; studentId: string; sessionId: string }
  | { kind: 'detail' | 'edit'; accountId: string }
  | IndicatorRoute;

export const routeTitles: Record<Route['kind'], string> = {
  entry: 'Inicio', access: 'Acceso', accounts: 'Profesores', invite: 'Invitar profesor',
  detail: 'Cuenta de profesor', edit: 'Editar cuenta', recoveryRequest: 'Recuperar contraseña',
  recoveryConfirm: 'Nueva contraseña', invitationAccept: 'Activar cuenta', unavailable: 'Página no disponible', blockedLink: 'Enlace no disponible',
  tasks: 'Tareas digitales', taskDetail: 'Ficha de tarea', students: 'Estudiantes',
  studentNew: 'Registrar estudiante', studentDetail: 'Ficha de estudiante', studentEdit: 'Editar estudiante',
  groups: 'Mis cursos', groupNew: 'Crear curso', groupDetail: 'Curso', groupEdit: 'Editar curso',
  observationMatrix: 'Registrar observaciones',
  assignments: 'Asignaciones', assignmentDetail: 'Estudiantes y códigos', supervisedExecution: 'Actividad en Kudlab Play',
  studentActivities: 'Tareas del estudiante', sessionResults: 'Detalle de sesión', submissionRecovery: 'Recuperar envío',
  ...indicatorRouteTitles,
};

export type WorkspaceSection = 'home' | 'accounts' | 'invite' | 'tasks' | 'groups' | 'indicators';
export type WorkspaceNavigation = {
  section: WorkspaceSection | undefined;
  breadcrumbs: { label: string; href?: string }[];
};

// Present only confirmed routes; authorization and data loading stay with App and the server.
export function workspaceNavigation(route: Route, role: Identity['role'], denied = false): WorkspaceNavigation {
  const current = { label: routeTitles[route.kind] };
  const deniedLocation: WorkspaceNavigation = { section: undefined, breadcrumbs: [{ label: 'Sección no disponible' }] };
  if (denied) return deniedLocation;
  const link = (kind: Route['kind'], href: string) => ({ label: routeTitles[kind], href });
  const accounts = link('accounts', '/usuarios');
  const courses = link('groups', '/academico/cursos');
  const groupPath = 'groupId' in route && route.groupId ? `/academico/cursos/${encodeURIComponent(route.groupId)}` : undefined;
  const course = groupPath ? [link('groupDetail', groupPath)] : [];
  const studentsPath = groupPath ? `${groupPath}/estudiantes` : '/academico/estudiantes';
  const studentPath = 'studentId' in route ? `${studentsPath}/${encodeURIComponent(route.studentId)}` : undefined;
  const student = studentPath ? [link('studentDetail', studentPath)] : [];
  const teacher = role === 'TEACHER';
  switch (route.kind) {
    case 'entry': case 'access': return { section: 'home', breadcrumbs: [{ label: 'Inicio' }] };
    case 'accounts': case 'invite': case 'detail': case 'edit':
      if (teacher) return deniedLocation;
      return { section: route.kind === 'invite' ? 'invite' : 'accounts', breadcrumbs: [
        ...(route.kind === 'accounts' ? [] : [accounts]),
        ...(route.kind === 'edit' ? [link('detail', `/usuarios/${encodeURIComponent(route.accountId)}`)] : []), current,
      ] };
    case 'tasks': case 'taskDetail':
      return { section: 'tasks', breadcrumbs: [...(route.kind === 'tasks' ? [] : [link('tasks', '/tareas')]), current] };
    case 'groups': case 'groupNew': case 'groupDetail': case 'groupEdit':
      if (teacher && (route.kind === 'groupNew' || route.kind === 'groupEdit')) return deniedLocation;
      return { section: 'groups', breadcrumbs: [...(route.kind === 'groups' ? [] : [courses]),
        ...(route.kind === 'groupEdit' ? course : []), current] };
    case 'indicatorCatalog': case 'indicatorDetail':
      if (!teacher) return deniedLocation;
      return { section: 'indicators', breadcrumbs: [...(route.kind === 'indicatorDetail' ? [link('indicatorCatalog', '/indicadores')] : []), current] };
    case 'studentIndicators':
      if (!teacher) return deniedLocation;
      return { section: 'indicators', breadcrumbs: [courses, ...course, ...student, current] };
    case 'students': case 'studentNew': case 'studentDetail': case 'studentEdit': case 'observationMatrix':
    case 'assignments': case 'assignmentDetail': case 'supervisedExecution':
    case 'studentActivities': case 'sessionResults': case 'submissionRecovery': {
      if (!teacher) return deniedLocation;
      const ancestors = groupPath ? [courses, ...course] : route.kind === 'students' ? [] : [link('students', '/academico/estudiantes')];
      if (route.kind === 'studentEdit' || ['studentActivities', 'sessionResults', 'submissionRecovery'].includes(route.kind)) ancestors.push(...student);
      if ((route.kind === 'sessionResults' || route.kind === 'submissionRecovery') && studentPath) ancestors.push(link('studentActivities', `${studentPath}/tareas`));
      if (groupPath && (route.kind === 'assignmentDetail' || route.kind === 'supervisedExecution')) ancestors.push(link('assignments', `${groupPath}/asignaciones`));
      if (groupPath && route.kind === 'supervisedExecution') ancestors.push(link('assignmentDetail', `${groupPath}/asignaciones/${encodeURIComponent(route.assignmentId)}`));
      return { section: 'groups', breadcrumbs: [...ancestors, current] };
    }
    default: return { section: 'home', breadcrumbs: [current] };
  }
}

export function resolveRoute(pathname: string, search: string): Route {
  if (new URLSearchParams(search).has('token') && !['/recuperar-acceso/confirmar', '/acceso/invitacion'].includes(pathname)) {
    return { kind: 'blockedLink' };
  }
  switch (pathname) {
    case '/': return { kind: 'entry' };
    case '/acceso': return { kind: 'access' };
    case '/acceso/invitacion': return { kind: 'invitationAccept' };
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
  const indicators = resolveIndicatorRoute(pathname);
  if (indicators) return indicators;
  const matrix = resolveObservationMatrix(pathname);
  if (matrix) return matrix;
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
  history: Pick<History, 'replaceState'>): { route: Route; recovery: RecoveryTicket; invitation: RecoveryTicket } {
  if (location.pathname === '/acceso/cambio-correo') {
    history.replaceState(null, '', '/acceso');
    return { route: { kind: 'access' }, recovery: { read: () => undefined, clear: () => {} }, invitation: { read: () => undefined, clear: () => {} } };
  }
  const route = resolveRoute(location.pathname, location.search);
  const params = new URLSearchParams(location.search);
  const values = params.getAll('token');
  let token = route.kind === 'recoveryConfirm' && values.length === 1 && values[0] ? values[0] : undefined;
  let invitation = route.kind === 'invitationAccept' && values.length === 1 && values[0]?.trim() ? values[0] : undefined;
  if (params.has('token') || route.kind === 'invitationAccept') history.replaceState(null, '', location.pathname);
  return { route, recovery: { read: () => token, clear: () => { token = undefined; } },
    invitation: { read: () => invitation, clear: () => { invitation = undefined; } } };
}
