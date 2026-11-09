import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useQuery } from '../usuarios/hooks';
import { Loading, Notice } from '../usuarios/shared';
import { navigate } from '../../lib/navigation.ts';
import type { IndicatorsApi } from './api.ts';
import { APPROVAL_LABELS } from './copy.ts';
import { PedagogicalNotice } from './PedagogicalNotice';
import { indicatorDetailPath } from './routes.ts';
import type { IndicatorDefinition } from './types.ts';

export const Heading = ({ children }: { children: string }) => <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{children}</h1>;
export const methodStatus = (d: IndicatorDefinition) => d.rule ? `${APPROVAL_LABELS[d.rule.approval.current]} · versión ${d.rule.version}` : 'Regla aún no publicada';

export function IndicatorCatalog({ api }: { api: IndicatorsApi }) {
  const query = useQuery(signal => api.definitions(signal), 'catalog');
  return <div className="staff-stack">
    <Heading>Indicadores</Heading>
    <PedagogicalNotice />
    {!query.result ? <Loading text="Consultando el catálogo de indicadores" /> : query.result.kind !== 'success'
      ? <Notice title="No pudimos cargar el catálogo"><p>Revisa tu conexión e inténtalo de nuevo. No se muestra información parcial.</p><Button variant="outline" className="mt-4" onClick={query.reload}>Reintentar</Button></Notice>
      : <div className="staff-table-region" role="region" aria-label="Catálogo de indicadores" tabIndex={0}>
        <Table><TableCaption>Indicadores implementados. Solo consulta; no se pueden editar aquí.</TableCaption>
          <TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Tarea</TableHead><TableHead>Unidad</TableHead><TableHead>Estado metodológico</TableHead></TableRow></TableHeader>
          <TableBody>{query.result.data.map(d => <TableRow key={d.metricCode}>
            <TableCell><a className="font-semibold underline underline-offset-4" href={indicatorDetailPath(d.metricCode)} onClick={navigate}>{d.label}</a></TableCell>
            <TableCell>{d.taskId}</TableCell><TableCell>{d.unit === '%' ? 'Porcentaje (%)' : 'Milisegundos (ms)'}</TableCell><TableCell>{methodStatus(d)}</TableCell>
          </TableRow>)}</TableBody></Table></div>}
  </div>;
}
