export const executionLabels = { READY: 'Preparada, sin iniciar', RUNNING: 'En ejecución', COMPLETED: 'Completada', INTERRUPTED: 'Interrumpida · datos parciales', EXPIRED: 'Preparación vencida', UNCONFIRMED: 'Sin cierre confirmado' };
export const processingLabels = { NOT_RECEIVED: 'Sin evidencia recibida', PENDING: 'Resultados guardados. Procesamiento pendiente', PROCESSING: 'Procesando evidencia guardada', COMPLETED: 'Procesamiento completado', FAILED: 'Cálculo fallido. La evidencia se conserva' };
export const unavailableLabels: Record<string, string> = {
  TASK_UNAVAILABLE: 'Tarea no disponible', OUTSIDE_WINDOW: 'Fuera del periodo de disponibilidad', ASSIGNMENT_CANCELLED: 'Asignación cancelada',
  PARTICIPATION_BLOCKED: 'Participación no autorizada', ATTEMPT_LIMIT: 'Límite de intentos alcanzado', ACTIVE_SESSION: 'Ya existe una actividad en ejecución', CONFIGURATION_UNSUPPORTED: 'Configuración incompatible',
  NO_VALID_TARGETS: 'No hay objetivos válidos', NO_VALID_DISTRACTORS: 'No hay distractores válidos', NO_VALID_RT: 'No hay tiempos de respuesta válidos',
  INSUFFICIENT_RT_FOR_VARIABILITY: 'Se necesitan al menos dos respuestas válidas para describir la variabilidad', SEGMENT_NOT_REACHED: 'Segmento no alcanzado',
  TECHNICAL_EXCLUSION: 'Evidencia excluida por incidencia técnica', ZERO_MEAN_RT: 'La media de los tiempos es cero', METHOD_NOT_APPROVED: 'Método no aprobado',
};
export const metricLabels: Record<string, string> = { accuracy_pct: 'Precisión', omission_rate_pct: 'Omisión', commission_rate_pct: 'Comisión', median_reaction_time_ms: 'Mediana del tiempo de respuesta', rt_sd_ms: 'Desviación del tiempo de respuesta', rt_cv_pct: 'Variabilidad relativa del tiempo de respuesta' };
export type Page<T> = { items: T[]; nextCursor: string | null };
export type AssignmentSummary = { id: string; taskId: string; title: string; publishedVersionId: string; configVersion: number; groupId: string; startsAt: string; endsAt: string; maxAttempts: number; status: 'OPEN' | 'CANCELLED'; availability: string; recipientCount: number; createdAt: string };
export type Recipient = { id: string; studentId: string; studentDisplayName: string; studentCode: string; attemptsStarted: number; activeSessionId: string | null; canLaunch: boolean; unavailableReasons: string[] };
export type Assignment = AssignmentSummary & { recipients: Recipient[] };
export type Grant = { sessionId: string; grantId: string; launchGrant: string; expiresAt: string; runtimeOrigin: string };
export type SessionSummary = { id: string; studentId: string; taskId: string; assignmentId: string; attemptNumber: number | null; launchMode: 'SUPERVISED'; configVersion: number; gameBuildId: string;
  executionStatus: keyof typeof executionLabels; processingStatus: keyof typeof processingLabels; preparedAt: string; startedAtServer: string | null; receivedAt: string | null; incidentCount: number; recordedTrialCount: number };
export type Indicator = { metricCode: string; scope: string; status: 'CALCULATED' | 'NOT_AVAILABLE'; value: number | null; unit: '%' | 'ms'; numerator: number | null; denominator: number | null; sampleSize: number; unavailabilityReason: string | null };
export type SessionDetail = SessionSummary & { declaredState: 'completed' | 'interrupted' | null; terminationReason: string | null; measuredDurationMs: number | null;
  publishedVersionId: string; configurationHash: string; configuration: Record<string, unknown>; device: Record<string, unknown> | null;
  receipt: { submissionId: string; receivedAt: string; evidenceHash: string } | null;
  calculation: { runId: string; ruleCode: string; ruleVersion: number; status: string; calculatedAt: string | null; summary: { observed: number; included: number; excluded: number } | Record<string, never>; indicators: Indicator[] } | null };
export type Evidence = Record<string, unknown> & { trial?: number; sequence?: number };
export const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
export const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT.*Z$/.test(v) && Number.isFinite(Date.parse(v));
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const numeric = (v: unknown) => v === null || typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function parseAssignmentSummary(v: unknown): AssignmentSummary | undefined {
  if (!object(v) || !isId(v.id) || v.taskId !== 'TG-01' || !text(v.title) || !isId(v.publishedVersionId) || !count(v.configVersion) || !v.configVersion || !isId(v.groupId) ||
    !date(v.startsAt) || !date(v.endsAt) || !date(v.createdAt) || !count(v.maxAttempts) || v.maxAttempts < 1 || v.maxAttempts > 10 || !['OPEN', 'CANCELLED'].includes(String(v.status)) || !['FUTURE', 'CURRENT', 'EXPIRED', 'CANCELLED'].includes(String(v.availability)) || !count(v.recipientCount)) return;
  return v as AssignmentSummary;
}
export function parseAssignment(v: unknown): Assignment | undefined {
  if (!parseAssignmentSummary(v) || !object(v) || !Array.isArray(v.recipients) || !v.recipients.every(r => object(r) && isId(r.id) && isId(r.studentId) && text(r.studentDisplayName) && text(r.studentCode) && count(r.attemptsStarted) && (r.activeSessionId === null || isId(r.activeSessionId)) && typeof r.canLaunch === 'boolean' && Array.isArray(r.unavailableReasons) && r.unavailableReasons.every(x => typeof x === 'string' && Object.hasOwn(unavailableLabels, x)))) return;
  if (v.recipients.length !== v.recipientCount || new Set(v.recipients.map(r => r.id)).size !== v.recipients.length) return;
  return v as Assignment;
}
export function parseSessionSummary(v: unknown): SessionSummary | undefined {
  if (!object(v) || !isId(v.id) || !isId(v.studentId) || !isId(v.assignmentId) || v.taskId !== 'TG-01' || v.launchMode !== 'SUPERVISED' ||
    !Object.hasOwn(executionLabels, String(v.executionStatus)) || !Object.hasOwn(processingLabels, String(v.processingStatus)) ||
    !count(v.configVersion) || !v.configVersion || !text(v.gameBuildId) || !date(v.preparedAt) || v.startedAtServer !== null && !date(v.startedAtServer) ||
    v.receivedAt !== null && !date(v.receivedAt) || v.attemptNumber !== null && (!count(v.attemptNumber) || v.attemptNumber < 1 || v.attemptNumber > 10) || !count(v.incidentCount) || !count(v.recordedTrialCount)) return;
  return v as SessionSummary;
}
export function parseSession(v: unknown): SessionDetail | undefined {
  if (!parseSessionSummary(v) || !object(v) || !isId(v.publishedVersionId) || typeof v.configurationHash !== 'string' || !/^[a-f0-9]{64}$/.test(v.configurationHash) || !object(v.configuration) || !numeric(v.measuredDurationMs) ||
    ![null, 'completed', 'interrupted'].includes(v.declaredState as string | null) || v.terminationReason !== null && !text(v.terminationReason) || v.device !== null && !object(v.device)) return;
  if (v.receipt !== null && (!object(v.receipt) || !isId(v.receipt.submissionId) || !date(v.receipt.receivedAt) || typeof v.receipt.evidenceHash !== 'string' || !/^[a-f0-9]{64}$/.test(v.receipt.evidenceHash))) return;
  const c = v.calculation;
  if (c !== null && (!object(c) || !isId(c.runId) || c.ruleCode !== 'TG01-DESCRIPTIVE-1' || !count(c.ruleVersion) || !['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'].includes(String(c.status)) || c.calculatedAt !== null && !date(c.calculatedAt) || !object(c.summary) || !Array.isArray(c.indicators) || !c.indicators.every(i => object(i) && Object.hasOwn(metricLabels, String(i.metricCode)) && ['SESSION', 'SEGMENT_1', 'SEGMENT_2', 'SEGMENT_3'].includes(String(i.scope)) && ['%', 'ms'].includes(String(i.unit)) && count(i.sampleSize) && numeric(i.numerator) && numeric(i.denominator) &&
    (i.status === 'CALCULATED' && typeof i.value === 'number' && Number.isFinite(i.value) && i.unavailabilityReason === null || i.status === 'NOT_AVAILABLE' && i.value === null && typeof i.unavailabilityReason === 'string' && Object.hasOwn(unavailableLabels, i.unavailabilityReason))))) return;
  return v as SessionDetail;
}
export function parseGrant(v: unknown): Grant | undefined {
  if (!object(v) || !isId(v.sessionId) || !isId(v.grantId) || typeof v.launchGrant !== 'string' || !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(v.launchGrant) || !date(v.expiresAt) || !text(v.runtimeOrigin)) return;
  return v as Grant;
}
export function parsePage<T>(v: unknown, parse: (v: unknown) => T | undefined): Page<T> | undefined {
  if (!object(v) || !Array.isArray(v.items) || !(v.nextCursor === null || typeof v.nextCursor === 'string' && v.nextCursor.length <= 2048)) return;
  const items = v.items.map(parse); if (items.some(i => i === undefined)) return;
  return { items: items as T[], nextCursor: v.nextCursor };
}
export const assignmentPath = (groupId: string, assignmentId?: string) => `/academico/cursos/${encodeURIComponent(groupId)}/asignaciones${assignmentId ? '/' + encodeURIComponent(assignmentId) : ''}`;
export const studentTasksPath = (groupId: string, studentId: string, sessionId?: string) => `/academico/cursos/${encodeURIComponent(groupId)}/estudiantes/${encodeURIComponent(studentId)}/tareas${sessionId ? '/' + encodeURIComponent(sessionId) : ''}`;
// Both IDs are public correlation, not authorization. Reload retains the same operation.
export const executionPath = (path: string) => `${path}?operationId=${crypto.randomUUID()}&bridgeId=${crypto.randomUUID()}`;
