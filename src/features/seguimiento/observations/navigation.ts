import { groupPath } from '../../academico/groups/navigation.ts';
import { isUuid } from '../../academico/students/types.ts';

export const observationMatrixPath = (groupId: string) => `${groupPath(groupId)}/observaciones`;
export function resolveObservationMatrix(pathname: string) {
  const match = /^\/academico\/cursos\/([^/]+)\/observaciones\/?$/.exec(pathname);
  if (!match) return;
  try {
    const groupId = decodeURIComponent(match[1]!);
    if (isUuid(groupId)) return { kind: 'observationMatrix' as const, groupId };
  } catch { /* Malformed paths are not navigation destinations. */ }
}
