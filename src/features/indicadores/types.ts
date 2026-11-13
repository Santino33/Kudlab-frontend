import { isId, object } from '../tareas/activities/types.ts';
import { mentalistaMetrics, mentalistaScopes, mentalistaReasons, mentalistaUnit, mentalistaGlobalOnly, validMentalistaContext, validMentalistaIndicator, type MentalistaMetric, type MentalistaScope, type MentalistaDetail } from '../tareas/activities/mentalista-types.ts';

export const metricCodes = ['accuracy_pct', 'omission_rate_pct', 'commission_rate_pct', 'median_reaction_time_ms', 'rt_sd_ms', 'rt_cv_pct'] as const;
export const scopes = ['SESSION', 'SEGMENT_1', 'SEGMENT_2', 'SEGMENT_3'] as const;
export const reasons = ['NO_VALID_TARGETS', 'NO_VALID_DISTRACTORS', 'NO_VALID_RT', 'INSUFFICIENT_RT_FOR_VARIABILITY', 'SEGMENT_NOT_REACHED', 'TECHNICAL_EXCLUSION', 'ZERO_MEAN_RT', 'METHOD_NOT_APPROVED'] as const;
export type MetricCode = typeof metricCodes[number];
export type Scope = typeof scopes[number];
export type Reason = typeof reasons[number];
export const metricUnits: Record<MetricCode, '%' | 'ms'> = { accuracy_pct: '%', omission_rate_pct: '%', commission_rate_pct: '%', median_reaction_time_ms: 'ms', rt_sd_ms: 'ms', rt_cv_pct: '%' };
const executionStatuses = ['READY', 'RUNNING', 'COMPLETED', 'INTERRUPTED', 'EXPIRED', 'UNCONFIRMED'] as const;
const processingStatuses = ['NOT_RECEIVED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

export type RuleRef = { code: string; version: number; approval: { current: 'PROPOSED' | 'APPROVED'; approvedAt: string | null } };
export type IndicatorDefinition = { metricCode: MetricCode | MentalistaMetric; taskId: 'TG-01' | 'TG-03'; label: string; description: string; calculation: string; unit: '%' | 'ms' | 'points' | 'count';
  scopes: (Scope | MentalistaScope)[]; inputs: string; unavailabilityReasons: (Reason | keyof typeof mentalistaReasons)[]; exclusions: string; rule: RuleRef | null };
export type HistoryIndicator = { metricCode: MetricCode; scope: Scope; status: 'CALCULATED' | 'NOT_AVAILABLE'; value: number | null; unit: '%' | 'ms';
  numerator: number | null; denominator: number | null; sampleSize: number; unavailabilityReason: Reason | null };
export type HistorySession = { sessionId: string; taskId: 'TG-01'; attemptNumber: number | null; occurredAt: string; executionStatus: typeof executionStatuses[number];
  processingStatus: typeof processingStatuses[number]; configVersion: number; publishedVersionId: string; incidentCount: number; recordedTrialCount: number;
  rule: RuleRef | null; approvalAtCalculation: 'APPROVED' | 'NOT_ESTABLISHED' | null; calculation: { runId: string; calculatedAt: string | null } | null;
  indicators: HistoryIndicator[]; detailAccess: 'AVAILABLE' | 'UNAVAILABLE' };
export type HistoryPage = { studentId: string; items: HistorySession[]; nextCursor: string | null };
export type MentalistaHistorySession = Omit<HistorySession, 'taskId' | 'indicators'> & { taskId: 'TG-03'; indicators: NonNullable<MentalistaDetail['calculation']>['indicators']; mentalista: Pick<MentalistaDetail, 'configuration' | 'configurationHash' | 'gameBuildId' | 'device' | 'preparation'> };
export type MentalistaHistoryPage = Omit<HistoryPage, 'items'> & { items: MentalistaHistorySession[] };

const has = <T extends readonly string[]>(list: T, v: unknown): v is T[number] => typeof v === 'string' && (list as readonly string[]).includes(v);
const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const instant = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v) && !Number.isNaN(Date.parse(v));
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));

function parseRule(v: unknown): RuleRef | undefined {
  if (!object(v) || !exact(v, ['code', 'version', 'approval']) || typeof v.code !== 'string' || !v.code || !Number.isInteger(v.version) || Number(v.version) < 1) return;
  const a = v.approval;
  if (!object(a) || !exact(a, ['current', 'approvedAt']) || !['PROPOSED', 'APPROVED'].includes(String(a.current)) || !(a.approvedAt === null || instant(a.approvedAt))) return;
  return { code: v.code, version: Number(v.version), approval: { current: a.current as 'PROPOSED' | 'APPROVED', approvedAt: a.approvedAt as string | null } };
}

export function parseDefinitions(value: unknown): IndicatorDefinition[] | undefined {
  if (!object(value) || !exact(value, ['items']) || !Array.isArray(value.items)) return;
  const items: IndicatorDefinition[] = [];
  for (const raw of value.items) {
    if (!object(raw) || !exact(raw, ['metricCode', 'taskId', 'label', 'description', 'calculation', 'unit', 'scopes', 'inputs', 'unavailabilityReasons', 'exclusions', 'rule'])) return;
    if (raw.taskId === 'TG-01') { if (!has(metricCodes, raw.metricCode) || raw.unit !== metricUnits[raw.metricCode]) return; }
    else if (raw.taskId === 'TG-03') { if (!Object.hasOwn(mentalistaMetrics, String(raw.metricCode)) || raw.unit !== mentalistaUnit(String(raw.metricCode))) return; }
    else return;
    for (const k of ['label', 'description', 'calculation', 'inputs', 'exclusions'] as const) if (typeof raw[k] !== 'string' || !raw[k]) return;
    const allowedScopes = raw.taskId === 'TG-01' ? scopes : mentalistaGlobalOnly(String(raw.metricCode)) ? ['SESSION'] : mentalistaScopes;
    const allowedReasons = raw.taskId === 'TG-01' ? reasons : Object.keys(mentalistaReasons);
    if (!Array.isArray(raw.scopes) || !raw.scopes.length || !raw.scopes.every(s => has(allowedScopes, s)) || new Set(raw.scopes).size !== raw.scopes.length || !Array.isArray(raw.unavailabilityReasons) || !raw.unavailabilityReasons.every(r => has(allowedReasons, r))) return;
    const rule = raw.rule === null ? null : parseRule(raw.rule);
    if (rule === undefined || raw.taskId === 'TG-03' && rule !== null && (rule.code !== 'TG03-DESCRIPTIVE-1' || rule.version !== 1)) return;
    items.push({ ...(raw as unknown as IndicatorDefinition), rule });
  }
  return new Set(items.map(i => `${i.taskId}:${i.metricCode}`)).size === items.length ? items : undefined;
}

function parseIndicator(v: unknown): HistoryIndicator | undefined {
  if (!object(v) || !exact(v, ['metricCode', 'scope', 'status', 'value', 'unit', 'numerator', 'denominator', 'sampleSize', 'unavailabilityReason'])) return;
  if (!has(metricCodes, v.metricCode) || !has(scopes, v.scope) || v.unit !== metricUnits[v.metricCode] || !count(v.sampleSize)) return;
  if (!(v.numerator === null || count(v.numerator)) || !(v.denominator === null || count(v.denominator))) return;
  // Ausencia ≠ cero: el valor solo existe si está calculado; todo no disponible lleva motivo.
  if (v.status === 'CALCULATED') { if (typeof v.value !== 'number' || !Number.isFinite(v.value) || v.unavailabilityReason !== null) return; }
  else if (v.status === 'NOT_AVAILABLE') { if (v.value !== null || !has(reasons, v.unavailabilityReason)) return; }
  else return;
  return v as unknown as HistoryIndicator;
}

export function parseHistorySession(v: unknown): HistorySession | undefined;
export function parseHistorySession(v: unknown, taskId: 'TG-03'): MentalistaHistorySession | undefined;
export function parseHistorySession(v: unknown, taskId: 'TG-01' | 'TG-03' = 'TG-01'): HistorySession | MentalistaHistorySession | undefined {
  if (!object(v) || !exact(v, ['sessionId', 'taskId', 'attemptNumber', 'occurredAt', 'executionStatus', 'processingStatus', 'configVersion', 'publishedVersionId', 'incidentCount',
    'recordedTrialCount', 'rule', 'approvalAtCalculation', 'calculation', 'indicators', 'detailAccess', ...(taskId === 'TG-03' ? ['mentalista'] : [])])) return;
  if (!isId(v.sessionId) || v.taskId !== taskId || !(v.attemptNumber === null || Number.isInteger(v.attemptNumber) && Number(v.attemptNumber) >= 1 && Number(v.attemptNumber) <= 10) || !instant(v.occurredAt)) return;
  if (taskId === 'TG-03' && !validMentalistaContext(v.mentalista)) return;
  if (!has(executionStatuses, v.executionStatus) || !has(processingStatuses, v.processingStatus) || !Number.isInteger(v.configVersion) || !isId(v.publishedVersionId)) return;
  if (!count(v.incidentCount) || !count(v.recordedTrialCount) || !has(['AVAILABLE', 'UNAVAILABLE'] as const, v.detailAccess)) return;
  if (!(v.approvalAtCalculation === null || has(['APPROVED', 'NOT_ESTABLISHED'] as const, v.approvalAtCalculation))) return;
  const rule = v.rule === null ? null : parseRule(v.rule);
  if (rule === undefined || !Array.isArray(v.indicators) || taskId === 'TG-03' && rule !== null && (rule.code !== 'TG03-DESCRIPTIVE-1' || rule.version !== 1)) return;
  let calculation: HistorySession['calculation'] = null;
  if (v.calculation !== null) {
    const c = v.calculation;
    if (!object(c) || !exact(c, ['runId', 'calculatedAt']) || !isId(c.runId) || !(c.calculatedAt === null || instant(c.calculatedAt))) return;
    calculation = { runId: c.runId, calculatedAt: c.calculatedAt as string | null };
  }
  if (taskId === 'TG-03') {
    if (!v.indicators.every(i => object(i) && exact(i, ['metricCode', 'scope', 'status', 'value', 'unit', 'numerator', 'denominator', 'sampleSize', 'unavailabilityReason']) && validMentalistaIndicator(i)) || !calculation && v.indicators.length || new Set(v.indicators.map(i => `${i.metricCode}:${i.scope}`)).size !== v.indicators.length) return;
    return { ...v, rule, calculation } as MentalistaHistorySession;
  }
  const indicators = v.indicators.map(parseIndicator);
  if (indicators.some(i => !i) || (!calculation && indicators.length)) return;
  const keys = indicators.map(i => `${i!.metricCode}:${i!.scope}`);
  if (new Set(keys).size !== keys.length) return;
  return { ...(v as unknown as HistorySession), rule, calculation, indicators: indicators as HistoryIndicator[] };
}

export function parseHistoryPage(value: unknown, studentId: string): HistoryPage | undefined;
export function parseHistoryPage(value: unknown, studentId: string, taskId: 'TG-03'): MentalistaHistoryPage | undefined;
export function parseHistoryPage(value: unknown, studentId: string, taskId: 'TG-01' | 'TG-03' = 'TG-01'): HistoryPage | MentalistaHistoryPage | undefined {
  if (!object(value) || !exact(value, ['studentId', 'items', 'nextCursor']) || value.studentId !== studentId || !Array.isArray(value.items)) return;
  if (!(value.nextCursor === null || typeof value.nextCursor === 'string' && value.nextCursor.length > 0)) return;
  const items = value.items.map(v => taskId === 'TG-03' ? parseHistorySession(v, taskId) : parseHistorySession(v));
  if (items.some(i => !i)) return;
  const sessions = items as (HistorySession | MentalistaHistorySession)[];
  // Una sola vez cada sesión y orden estable: fecha descendente, desempate por id descendente.
  if (new Set(sessions.map(s => s.sessionId)).size !== sessions.length) return;
  for (let i = 1; i < sessions.length; i++) {
    const a = sessions[i - 1]!, b = sessions[i]!;
    if (a.occurredAt < b.occurredAt || a.occurredAt === b.occurredAt && a.sessionId < b.sessionId) return;
  }
  return { studentId, items: sessions, nextCursor: value.nextCursor as string | null } as HistoryPage | MentalistaHistoryPage;
}
