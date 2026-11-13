import type { RuntimeEnvelope, RuntimeContext, SessionDetail as ContractDetail } from '../../../../contract/kudlab-runtime-1.3.0/types';
import profile from '../../../../contract/kudlab-runtime-1.3.0/mentalista-profile.json' with { type: 'json' };

export type MentalistaEnvelope = Extract<RuntimeEnvelope, { taskId: 'TG-03' }>;
export type MentalistaConfig = Extract<RuntimeContext, { taskId: 'TG-03' }>['config'];
export type MentalistaDetail = Omit<Extract<ContractDetail, { taskId: 'TG-03' }>, 'device'> & { device: MentalistaEnvelope['device'] | null };
export type MentalistaTrial = MentalistaEnvelope['events'][number] & { calculationDecision: null | {
  trial: number; itemId: string; load: number; included: boolean; rtIncluded: boolean; reason: 'TECHNICAL_EXCLUSION' | 'NOT_EVALUATED' | null;
  result: 'correct' | 'incorrect' | 'omission' | 'not_evaluated'; correctAnswer: number; selectedAnswer: number | null;
  diff: number | null; rtMs: number | null; anticipatory: boolean;
} };
export const mentalistaMetrics = {
  accuracy_pct: 'Precisión', error_rate_pct: 'Error', omission_rate_pct: 'Omisión', median_reaction_time_ms: 'Mediana del tiempo de respuesta',
  mean_reaction_time_ms: 'Media del tiempo de respuesta', rt_sd_ms: 'Desviación del tiempo de respuesta', rt_cv_pct: 'Variabilidad relativa del tiempo de respuesta',
  delta_precision_pts: 'Diferencia de precisión (carga 4 − carga 1)', delta_precision_rel_pct: 'Diferencia relativa de precisión (base carga 1)', chance_level_pct: 'Referencia de azar',
  selection_position_1_count: 'Selecciones en posición 1', selection_position_2_count: 'Selecciones en posición 2', selection_position_3_count: 'Selecciones en posición 3', selection_position_4_count: 'Selecciones en posición 4',
} as const;
export const mentalistaReasons = {
  NO_VALID_ITEMS: 'No hay ítems válidos', INSUFFICIENT_RT_DATA: 'Se requieren cinco tiempos correctos válidos globales o tres por carga',
  INSUFFICIENT_LOAD_DATA: 'Se requieren dos ítems válidos en cada carga extrema', ZERO_BASELINE: 'La precisión de carga 1 es cero',
  LOAD_NOT_REACHED: 'Carga no alcanzada', METHOD_NOT_APPROVED: 'Método no aprobado', TECHNICAL_EXCLUSION: 'Evidencia excluida por incidencia técnica', ZERO_MEAN_RT: 'Media del tiempo de respuesta igual a cero',
} as const;
export const mentalistaScopes = ['SESSION', 'LOAD_1', 'LOAD_2', 'LOAD_3', 'LOAD_4'] as const;
export type MentalistaMetric = keyof typeof mentalistaMetrics;
export type MentalistaScope = typeof mentalistaScopes[number];
export const mentalistaUnit = (code: string) => code.endsWith('_count') ? 'count' : code === 'delta_precision_pts' ? 'points' : code.endsWith('_ms') ? 'ms' : '%';
export const mentalistaGlobalOnly = (code: string) => code.startsWith('delta_') || code.startsWith('selection_') || code === 'chance_level_pct';
export function validMentalistaContext(v: unknown) {
  return object(v) && Object.keys(v).length === 5 && v.gameBuildId === 'tg03-mentalista-1' && v.configurationHash === profile.configurationHash && validMentalistaConfig(v.configuration) &&
    (v.device === null || validMentalistaDevice(v.device)) && (v.preparation === null || validMentalistaPreparation(v.preparation));
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const time = (v: unknown): v is number => finite(v) && v >= 0;
const nullableTime = (v: unknown) => v === null || time(v);
const same = (value: unknown, expected: unknown): boolean => {
  if (value === expected) return true;
  if (Array.isArray(expected)) return Array.isArray(value) && value.length === expected.length && expected.every((v, i) => same(value[i], v));
  return object(expected) && object(value) && Object.keys(value).length === Object.keys(expected).length && Object.entries(expected).every(([key, v]) => same(value[key], v));
};
export const validMentalistaConfig = (v: unknown): v is MentalistaConfig => same(v, profile.config);
export function validMentalistaDevice(v: unknown) {
  return object(v) && Object.keys(v).length === 6 && count(v.viewportWidth) && v.viewportWidth > 0 && count(v.viewportHeight) && v.viewportHeight > 0 &&
    time(v.stageWidthCss) && v.stageWidthCss > 0 && v.stageWidthCss <= v.viewportWidth && time(v.stageHeightCss) && v.stageHeightCss > 0 && v.stageHeightCss <= v.viewportHeight &&
    typeof v.touchCapable === 'boolean' && ['portrait', 'landscape'].includes(String(v.layoutPreset));
}
export function validMentalistaPreparation(v: unknown) {
  if (!object(v) || Object.keys(v).length !== 3 || !count(v.instructionRepeats) || v.instructionRepeats > 1000 || !Array.isArray(v.practice) || v.practice.length < 1 || v.practice.length > 2 || !Array.isArray(v.resourceIncidents) || v.resourceIncidents.length > 1000) return false;
  if (!v.practice.every((round, n) => object(round) && round.round === n + 1 && Array.isArray(round.items) && round.items.length === 2 && round.items.every((trial, i) => {
    const expected = profile.config.bank.practice[i]!;
    return object(trial) && trial.itemId === expected.id && (trial.selectedIdx === null || count(trial.selectedIdx) && trial.selectedIdx <= 3) &&
      (trial.selectedIdx === null ? trial.rtMs === null && trial.result === 'omission' : time(trial.rtMs) && trial.rtMs < 30000 && trial.result === (trial.selectedIdx === expected.correctIdx ? 'correct' : 'incorrect'));
  }))) return false;
  const first = v.practice[0];
  if (first.items.every((i: { result: string }) => i.result === 'correct') !== (v.practice.length === 1)) return false;
  return v.resourceIncidents.every(i => object(i) && Object.keys(i).length === 3 && ['preparation', 'closing'].includes(String(i.phase)) && ['transition_skipped', 'resource_error'].includes(String(i.type)) &&
    ['video_error', 'timeout', 'autoplay_blocked', 'reduced_motion', 'closing_recovered'].includes(String(i.reason)));
}
export function validMentalistaIndicator(i: unknown) {
  if (!object(i) || Object.keys(i).length !== 9 || !Object.hasOwn(mentalistaMetrics, String(i.metricCode)) || !(mentalistaScopes as readonly unknown[]).includes(i.scope) || !count(i.sampleSize) || !(i.numerator === null || count(i.numerator)) || !(i.denominator === null || count(i.denominator))) return false;
  const code = String(i.metricCode), unit = mentalistaUnit(code);
  if (i.unit !== unit || mentalistaGlobalOnly(code) && i.scope !== 'SESSION') return false;
  return i.status === 'CALCULATED' && finite(i.value) && i.unavailabilityReason === null || i.status === 'NOT_AVAILABLE' && i.value === null && Object.hasOwn(mentalistaReasons, String(i.unavailabilityReason));
}
const countKeys = ['nPlanned', 'nObserved', 'nPresented', 'nValid', 'nCorrect', 'nIncorrect', 'nOmission', 'nAnticipatory', 'nRt'] as const;
function validCounts(v: unknown, planned: number): boolean {
  if (!object(v) || !countKeys.every(k => count(v[k]))) return false;
  const c = v as Record<typeof countKeys[number], number>;
  return c.nPlanned === planned && c.nObserved <= planned && c.nPresented <= c.nObserved && c.nValid <= c.nPresented && c.nValid === c.nCorrect + c.nIncorrect + c.nOmission && c.nRt <= c.nCorrect && c.nAnticipatory <= c.nValid;
}
export function parseMentalistaDetail(v: Record<string, unknown>): MentalistaDetail | undefined {
  if (v.taskId !== 'TG-03' || v.gameBuildId !== 'tg03-mentalista-1' || v.configurationHash !== profile.configurationHash || !validMentalistaConfig(v.configuration) ||
    v.device !== null && !validMentalistaDevice(v.device) || v.preparation !== null && !validMentalistaPreparation(v.preparation) || !count(v.extraResponseCount) ||
    !nullableTime(v.measuredDurationMs) || ![null, 'completed', 'interrupted'].includes(v.declaredState as string | null) ||
    v.terminationReason !== null && !['items_completed', 'user_exit', 'focus_lost', 'visibility_lost', 'script_error', 'storage_failure', 'frame_gap', 'layout_changed', 'recovered_after_reload', 'evidence_limit', 'resource_error'].includes(String(v.terminationReason))) return;
  if ((v.declaredState === 'completed') !== (v.terminationReason === 'items_completed') || (v.receipt === null) !== (v.declaredState === null) ||
    v.receipt !== null && (v.device === null || v.preparation === null || v.measuredDurationMs === null)) return;
  const c = v.calculation;
  if (c !== null) {
    if (!object(c) || c.ruleCode !== 'TG03-DESCRIPTIVE-1' || c.ruleVersion !== 1 || !['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'].includes(String(c.status)) || !object(c.summary) || !Array.isArray(c.indicators) || !c.indicators.every(validMentalistaIndicator)) return;
    if (new Set(c.indicators.map(i => `${i.metricCode}:${i.scope}`)).size !== c.indicators.length) return;
    if (c.status === 'SUCCEEDED' && (v.processingStatus !== 'COMPLETED' || c.indicators.length !== 42) || c.status !== 'SUCCEEDED' && c.indicators.length) return;
    if (Object.keys(c.summary).length) {
      const s = c.summary;
      if (!['observed', 'included', 'excluded', 'nPlanned', 'nObserved', 'nPresented', 'nValid', 'nCorrect', 'nIncorrect', 'nOmission', 'nAnticipatory', 'nRt'].every(key => count(s[key])) ||
        s.nPlanned !== 12 || s.observed !== (s.included as number) + (s.excluded as number) || s.nValid !== (s.nCorrect as number) + (s.nIncorrect as number) + (s.nOmission as number) ||
        !Array.isArray(s.byLoad) || s.byLoad.length !== 4 || !Array.isArray(s.selectionPositionCounts) || s.selectionPositionCounts.length !== 4 || !s.selectionPositionCounts.every(count)) return;
      const byLoad = s.byLoad;
      if (!validCounts(s, 12) || s.itemBankVersion !== profile.config.bank.itemBankVersion || s.nObserved !== s.observed || s.nValid !== s.included ||
        !s.byLoad.every((row, index) => object(row) && row.load === index + 1 && validCounts(row, 3)) ||
        countKeys.some(key => byLoad.reduce((sum: number, row: Record<string, number>) => sum + row[key]!, 0) !== s[key]) ||
        s.selectionPositionCounts.reduce((a: number, b: number) => a + b, 0) !== Number(s.nCorrect) + Number(s.nIncorrect)) return;
    }
    else if (c.status === 'SUCCEEDED') return;
  }
  return v as MentalistaDetail;
}
export function parseMentalistaTrial(v: unknown): MentalistaTrial | undefined {
  if (!object(v) || !count(v.trial) || v.trial < 1 || v.trial > 12 || !time(v.startedAtMs) || !time(v.closedAtMs) || v.closedAtMs < v.startedAtMs || !Array.isArray(v.instructionShownAtMs) || !v.instructionShownAtMs.every(time) ||
    !nullableTime(v.optionsShownAtMs) || !nullableTime(v.selectedAtMs) || ![null, 0, 1, 2, 3].includes(v.selectedIdx as number | null) ||
    ![null, 'mouse', 'touch', 'pen', 'keyboard'].includes(v.responseDevice as string | null) || !['response', 'timeout', 'interruption'].includes(String(v.closureReason))) return;
  const item = profile.config.bank.items.find(i => i.id === v.itemId);
  if (!item || v.load !== item.load || v.start !== item.start || !same(v.ops, item.ops) || !same(v.intermediates, item.intermediates) || !same(v.optionValues, item.options) || !count(v.plannedBlock) || v.plannedBlock < 1 || v.plannedBlock > 3) return;
  const shown = v.instructionShownAtMs as number[], load = v.load as number;
  if (shown.length > load + 1 || shown.length && shown[0]! < v.startedAtMs + 1000 || shown.some((at, i) => at > (v.closedAtMs as number) || i > 0 && at < shown[i - 1]! + 3000) ||
    v.optionsShownAtMs !== null && (shown.length !== load + 1 || (v.optionsShownAtMs as number) < shown.at(-1)! + 3000 || (v.optionsShownAtMs as number) > v.closedAtMs)) return;
  if (v.closureReason === 'response') {
    if (v.optionsShownAtMs === null || v.selectedIdx === null || v.selectedAtMs === null || v.responseDevice === null || (v.selectedAtMs as number) < (v.optionsShownAtMs as number) || (v.selectedAtMs as number) >= (v.optionsShownAtMs as number) + 30000 || v.selectedAtMs !== v.closedAtMs) return;
  } else if (v.selectedIdx !== null || v.selectedAtMs !== null || v.responseDevice !== null || v.closureReason === 'timeout' && (v.optionsShownAtMs === null || v.closedAtMs < (v.optionsShownAtMs as number) + 30000)) return;
  const d = v.calculationDecision;
  if (d !== null && (!object(d) || d.trial !== v.trial || d.itemId !== v.itemId || d.load !== v.load || typeof d.included !== 'boolean' || typeof d.rtIncluded !== 'boolean' || typeof d.anticipatory !== 'boolean' ||
    !['correct', 'incorrect', 'omission', 'not_evaluated'].includes(String(d.result)) || ![null, 'TECHNICAL_EXCLUSION', 'NOT_EVALUATED'].includes(d.reason as string | null) ||
    d.correctAnswer !== item.answer || d.selectedAnswer !== (v.selectedIdx === null ? null : item.options[v.selectedIdx as number]) ||
    d.diff !== (d.selectedAnswer === null ? null : (d.selectedAnswer as number) - item.answer) || !nullableTime(d.rtMs))) return;
  if (object(d)) {
    const rt = v.optionsShownAtMs !== null && v.selectedAtMs !== null ? Number(v.selectedAtMs) - Number(v.optionsShownAtMs) : null;
    const result = v.closureReason === 'interruption' ? 'not_evaluated' : v.closureReason === 'timeout' ? 'omission' : v.selectedIdx === item.correctIdx ? 'correct' : 'incorrect';
    if (d.rtMs !== rt || d.anticipatory !== (rt !== null && rt < 400) || d.result !== result || d.included !== (result !== 'not_evaluated' && d.reason !== 'TECHNICAL_EXCLUSION') || d.rtIncluded !== (d.included && result === 'correct' && !d.anticipatory && rt !== null) || (d.included ? d.reason !== null : d.reason === null)) return;
  }
  return v as MentalistaTrial;
}
