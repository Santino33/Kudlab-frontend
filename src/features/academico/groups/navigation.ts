import { requestNavigation } from '../../../lib/navigation.ts';

export const groupsPath = '/academico/cursos';
export const groupPath = (id: string) => `${groupsPath}/${encodeURIComponent(id)}`;
export const groupStudentPath = (groupId: string, studentId: string) => `${groupPath(groupId)}/estudiantes/${encodeURIComponent(studentId)}`;
export function go(href: string) {
  void requestNavigation(href);
}
