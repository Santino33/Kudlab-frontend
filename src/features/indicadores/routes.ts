import { metricCodes, type MetricCode } from './types.ts';

export type IndicatorRoute =
  | { kind: 'indicatorCatalog' }
  | { kind: 'indicatorDetail'; metricCode: MetricCode }
  | { kind: 'studentIndicators'; groupId: string; studentId: string };

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const history = new RegExp(`^/academico/cursos/(${uuid})/estudiantes/(${uuid})/indicadores$`);

// Delegado desde `resolveRoute`: solo reconoce sus tres rutas exactas; ids y códigos inválidos no se resuelven.
export function resolveIndicatorRoute(pathname: string): IndicatorRoute | undefined {
  if (pathname === '/indicadores') return { kind: 'indicatorCatalog' };
  const detail = /^\/indicadores\/([a-z_]+)$/.exec(pathname);
  if (detail) return (metricCodes as readonly string[]).includes(detail[1]!) ? { kind: 'indicatorDetail', metricCode: detail[1] as MetricCode } : undefined;
  const match = history.exec(pathname);
  return match ? { kind: 'studentIndicators', groupId: match[1]!, studentId: match[2]! } : undefined;
}
export const indicatorRouteTitles = { indicatorCatalog: 'Indicadores', indicatorDetail: 'Ficha de indicador', studentIndicators: 'Historia de indicadores' } as const;
export const studentIndicatorsPath = (groupId: string, studentId: string) => `/academico/cursos/${groupId}/estudiantes/${studentId}/indicadores`;
export const indicatorDetailPath = (metricCode: MetricCode) => `/indicadores/${metricCode}`;
