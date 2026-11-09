import { useId } from 'react';
import { DEFAULT_LAYOUT as L, place, SHAPES, type ChartModel, type Placed } from './chart-model.ts';
import { formatValue, longDate, metricLabel } from './format.ts';
import { SCOPE_LABELS } from './copy.ts';

const R = 6; // marcadores de 12 px, por encima del mínimo de 8 px
function Marker({ shape, x, y, hollow }: { shape: number; x: number; y: number; hollow: boolean }) {
  const common = { className: hollow ? 'fill-background stroke-foreground' : 'fill-foreground stroke-background', strokeWidth: hollow ? 2 : 1.5 };
  switch (SHAPES[shape % SHAPES.length]) {
    case 'square': return <rect x={x - R} y={y - R} width={2 * R} height={2 * R} {...common} />;
    case 'diamond': return <polygon points={`${x},${y - R - 1} ${x + R + 1},${y} ${x},${y + R + 1} ${x - R - 1},${y}`} {...common} />;
    case 'triangle': return <polygon points={`${x},${y - R - 1} ${x + R + 1},${y + R} ${x - R - 1},${y + R}`} {...common} />;
    default: return <circle cx={x} cy={y} r={R} {...common} />;
  }
}
const pointText = (p: Placed, unit: '%' | 'ms') => `${longDate(p.at)}: ${p.kind === 'value' ? formatValue(p.value, unit) : `sin dato (${p.reason})`}. ${p.condition}${p.interrupted ? '. Sesión interrumpida: no comparable' : ''}`;

// Un indicador y un alcance. Puntos aislados por sesión: sin líneas, flechas ni lectura de tendencia. El eje x es ordinal (el espaciado no mide tiempo).
export function IndicatorChart({ model, studentName, range }: { model: ChartModel; studentName: string; range: string }) {
  const id = useId(), placed = place(model), title = `${metricLabel(model.metricCode)} (${model.unit}) de ${studentName} · TG-01 · ${SCOPE_LABELS[model.scope]} · ${range}`;
  const values = placed.filter(p => p.kind === 'value').length, missing = placed.length - values;
  const description = `${placed.length} sesiones mostradas, ordenadas de la más antigua a la más reciente. ${values} con valor y ${missing} sin dato. Los valores completos están en la tabla siguiente.`;
  return <figure className="grid gap-3">
    <figcaption id={`${id}-t`} className="font-semibold [overflow-wrap:anywhere]">{title}</figcaption>
    <svg role="img" aria-labelledby={`${id}-t ${id}-d`} viewBox={`0 0 ${L.width} ${L.height}`} className="h-auto w-full max-w-3xl text-foreground">
      <desc id={`${id}-d`}>{description}</desc>
      {model.ticks.map(t => { const y = L.plotBottom - t / model.max * (L.plotBottom - L.top);
        return <g key={t}><line x1={L.left} x2={L.width - L.right} y1={y} y2={y} className="stroke-border" strokeWidth={1} />
          <text x={L.left - 8} y={y + 4} textAnchor="end" className="fill-current text-xs">{new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(t)}</text></g>; })}
      <text x={L.left - 8} y={L.top - 4} textAnchor="end" className="fill-current text-xs">{model.unit}</text>
      <line x1={L.left} x2={L.width - L.right} y1={L.plotBottom} y2={L.plotBottom} className="stroke-foreground" strokeWidth={1.5} />
      {model.xLabels.map(l => { const p = placed[l.index]!; return <text key={l.index} x={p.x} y={L.plotBottom + 18} textAnchor="middle" className="fill-current text-xs">{l.text}</text>; })}
      <text x={L.left} y={L.missingY - 18} className="fill-current text-xs">Sin dato</text>
      {placed.map(p => <g key={p.sessionId}><title>{pointText(p, model.unit)}</title><Marker shape={p.shape} x={p.x} y={p.y} hollow={p.kind === 'missing'} /></g>)}
    </svg>
    {model.conditions.length > 1 && <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Condiciones de las sesiones">
      {model.conditions.map(c => <li key={c.key} className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><Marker shape={c.shape} x={8} y={8} hollow={false} /></svg>{c.label}</li>)}</ul>}
    <p className="text-sm">Cada punto es una sesión; no se unen entre sí ni se interpreta tendencia. El marcador hueco indica sin dato. Se muestran solo las sesiones cargadas.</p>
  </figure>;
}
