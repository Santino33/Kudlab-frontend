import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navigate } from '../../lib/navigation.ts';
import { studentIndicatorsPath } from './routes.ts';

// Enlace único desde la ficha del estudiante. Depende solo de que el estudiante esté cargado (ámbito académico confirmado):
// no usa el snapshot ni el estado de consentimiento ni `isActive`, para que otra fuente indisponible no oculte la historia.
export function StudentIndicatorsLink({ student }: { student: { id: string; groupId: string } }) {
  return <a href={studentIndicatorsPath(student.groupId, student.id)} onClick={navigate} className={cn(buttonVariants({ variant: 'outline' }), 'w-fit max-w-full whitespace-normal text-left')}>Ver indicadores del estudiante</a>;
}
