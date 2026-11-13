import { Button } from '@/components/ui/button';
import { useQuery } from '../usuarios/hooks';
import { Loading, Notice } from '../usuarios/shared';
import { navigate } from '../../lib/navigation.ts';
import type { IndicatorsApi } from './api.ts';
import { SCOPE_LABELS, unavailableLabels } from './copy.ts';
import { Heading, methodStatus, unitLabel } from './IndicatorCatalog';
import { PedagogicalNotice } from './PedagogicalNotice';
import type { MetricCode } from './types.ts';
import { mentalistaReasons, type MentalistaMetric } from '../tareas/activities/mentalista-types.ts';
const reasonLabels: Record<string, string> = { ...unavailableLabels, ...mentalistaReasons };

const Item = ({ term, children }: { term: string; children: React.ReactNode }) => <div className="grid gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4"><dt className="font-semibold">{term}</dt><dd className="[overflow-wrap:anywhere]">{children}</dd></div>;

// Ficha de solo lectura: sin controles de edición. Describe lo que ya calcula el sistema; no define fórmulas nuevas.
export function IndicatorDefinitionView({ api, metricCode, taskId = 'TG-01' }: { api: IndicatorsApi; metricCode: MetricCode | MentalistaMetric; taskId?: 'TG-01' | 'TG-03' }) {
  const query = useQuery(signal => api.definitions(signal), 'catalog');
  const found = query.result?.kind === 'success' ? query.result.data.find(d => d.taskId === taskId && d.metricCode === metricCode) : undefined;
  return <div className="staff-stack">
    <Heading>{found?.label ?? 'Ficha de indicador'}</Heading>
    <PedagogicalNotice />
    {!query.result ? <Loading text="Consultando la ficha del indicador" /> : query.result.kind !== 'success'
      ? <Notice title="No pudimos cargar la ficha"><p>Revisa tu conexión e inténtalo de nuevo.</p><Button variant="outline" className="mt-4" onClick={query.reload}>Reintentar</Button></Notice>
      : !found ? <Notice title="Indicador no disponible"><p>No existe un indicador con ese código en el catálogo actual.</p></Notice>
      : <dl className="grid gap-4">
        <Item term="Tarea">{found.taskId}</Item>
        <Item term="Qué mide">{found.description}</Item>
        <Item term="Cómo se calcula">{found.calculation}</Item>
        <Item term="Unidad">{unitLabel(found.unit)}</Item>
        <Item term="Datos necesarios">{found.inputs}</Item>
        <Item term="Alcances">{found.scopes.map(s => s.startsWith('LOAD_') ? `Carga ${s.slice(-1)}` : SCOPE_LABELS[s as keyof typeof SCOPE_LABELS]).join(', ')}</Item>
        <Item term="Qué no cuenta">{found.exclusions}</Item>
        <Item term="Cuándo no se calcula"><ul className="list-disc pl-5">{found.unavailabilityReasons.map(r => <li key={r}>{reasonLabels[r]}</li>)}</ul></Item>
        <Item term="Regla y estado metodológico">{methodStatus(found)}</Item>
      </dl>}
    <a className="w-fit font-semibold underline underline-offset-4" href="/indicadores" onClick={navigate}>Volver al catálogo</a>
  </div>;
}
