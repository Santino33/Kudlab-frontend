import { incidentLabels } from './types.ts';

export const contextLabels: Record<string, string> = {
  durationMs: 'Duración prevista (ms)', segmentBoundariesMs: 'Límites de segmentos (ms)', fallSpeedUnitsPerSecond: 'Velocidad de caída (unidades/s)',
  spawnIntervalMs: 'Intervalo de generación (ms)', starProbability: 'Probabilidad de estrella', stimulusSizeUnits: 'Tamaño de estímulo (unidades)',
  minimumDistanceUnits: 'Separación mínima (unidades)', positionAttempts: 'Intentos de posicionamiento', presentationRule: 'Regla de presentación',
  maxFrameGapMs: 'Intervalo máximo entre fotogramas (ms)', minimumStageScale: 'Escala mínima', inputProfile: 'Perfil de entrada',
  layoutRule: 'Regla de distribución', referenceWidthUnits: 'Ancho de referencia (unidades)', minimumLaneWidthUnits: 'Ancho mínimo de carril (unidades)', maximumLanes: 'Máximo de carriles',
  logicalWidth: 'Ancho lógico (unidades)', logicalHeight: 'Alto lógico (unidades)', lanes: 'Carriles',
  viewportWidth: 'Ancho del navegador (px)', viewportHeight: 'Alto del navegador (px)', stageScale: 'Escala del área de juego', touchCapable: 'Capacidad táctil', stageWidthCss: 'Ancho del área de juego (px CSS)', stageHeightCss: 'Alto del área de juego (px CSS)',
};
const values: Record<string, string> = { FULLY_VISIBLE: 'Estímulo completamente visible', POINTER_V1: 'Puntero, versión 1', VIEWPORT_FIT_V2: 'Ajuste al área disponible, versión 2' };
export function contextValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(' / ');
  if (value !== null && typeof value === 'object' && 'min' in value && 'max' in value) return `${value.min}–${value.max}`;
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return values[String(value)] ?? String(value);
}
export const terminationLabels: Record<string, string> = { ...incidentLabels, time_limit: 'Tiempo previsto completado', user_exit: 'Salida del participante' };
export const milliseconds = (value: number | null) => value === null ? 'No disponible' : `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ms`;
