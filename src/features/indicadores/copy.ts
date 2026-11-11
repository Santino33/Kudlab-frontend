import { executionLabels, metricLabels, processingLabels, unavailableLabels } from '../tareas/activities/types.ts';

// Texto aprobado como interpretación del responsable en Plan (R-9, V3 RF-019); no es dictamen clínico.
export const PEDAGOGICAL_NOTICE = 'Los indicadores son información complementaria para el seguimiento pedagógico y no constituyen un diagnóstico clínico.';
export const SOURCE_LABEL = 'Fuente: Tareas digitales';
export const COMPARABILITY_NOTE = 'Para comparar sesiones, revise antes la tarea, la dificultad, las incidencias y la versión de cada una. Esta vista no calcula diferencias entre sesiones.';
export const SCOPE_LABELS = { SESSION: 'Toda la actividad', SEGMENT_1: 'Parte 1', SEGMENT_2: 'Parte 2', SEGMENT_3: 'Parte 3' } as const;
export const APPROVAL_LABELS = { PROPOSED: 'Propuesto', APPROVED: 'Aprobado' } as const;
export const APPROVAL_AT_CALCULATION_LABELS = { APPROVED: 'Aprobado al calcular', NOT_ESTABLISHED: 'Estado al calcular no establecido' } as const;
export const DETAIL_UNAVAILABLE = 'El detalle no está disponible con su acceso actual.';
export const NO_DATA = '—';
export { executionLabels, metricLabels, processingLabels, unavailableLabels };
