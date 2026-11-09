import { useQuery } from '../usuarios/hooks';
import { Loading, Notice } from '../usuarios/shared';
import type { StudentsApi } from '../academico/students/api.ts';
import type { Group } from '../academico/groups/types.ts';
import type { IndicatorsApi } from './api.ts';
import { StudentIndicators } from './StudentIndicators';

// Resuelve el estudiante dentro del curso de la ruta (como StudentContext) y exige que pertenezca a él. Un 404 revalida el contexto en vez de suponer pérdida total del ámbito.
export function StudentIndicatorsRoute({ api, studentsApi, group, studentId }: { api: IndicatorsApi; studentsApi: StudentsApi; group: Group; studentId: string }) {
  const q = useQuery(signal => studentsApi.detail(studentId, signal), studentId);
  if (!q.result) return <Loading text="Comprobando estudiante y curso" />;
  if (q.result.kind !== 'success' || q.result.data.groupId !== group.id)
    return <Notice title="No disponible con tu acceso actual"><p>No encontramos este estudiante en el curso o ya no tienes acceso.</p></Notice>;
  const student = q.result.data;
  return <StudentIndicators api={api} studentId={student.id} studentName={`${student.firstName} ${student.lastName}`} groupId={group.id} onRevalidate={q.reload} />;
}
