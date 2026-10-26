export const reasonLabels = {
  INTEGRATION_PENDING: 'Pendiente de integración: el juego aún no ha sido cotejado y validado con la plataforma.',
  CONFIGURATION_UNPUBLISHED: 'Sin configuración publicada.',
  TASK_DISABLED: 'La tarea está deshabilitada administrativamente.',
};
export type TaskSummary = {
  id: string; title: string; description: string; isEnabled: boolean; integrationReady: boolean;
  publishedVersion: { id: string; version: number } | null;
  assignable: boolean; unavailableReasons: (keyof typeof reasonLabels)[]; revision: number;
};
export type TaskDetail = TaskSummary & { purpose: string; pedagogicalNotice: string };

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
export const isTaskId = (value: unknown): value is string => typeof value === 'string' && /^TG-[0-9]{2}$/.test(value);

export function parseTask(value: unknown): TaskSummary | undefined {
  if (!object(value) || !isTaskId(value.id) ||
    !text(value.title) || !text(value.description) || typeof value.isEnabled !== 'boolean' ||
    typeof value.integrationReady !== 'boolean' || typeof value.assignable !== 'boolean' || !positive(value.revision) ||
    !Array.isArray(value.unavailableReasons) || !value.unavailableReasons.every((reason) => typeof reason === 'string' && Object.hasOwn(reasonLabels, reason))) return;
  const version = value.publishedVersion;
  if (version !== null && (!object(version) || typeof version.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(version.id) || !positive(version.version))) return;
  return { id: value.id, title: value.title, description: value.description, isEnabled: value.isEnabled,
    integrationReady: value.integrationReady, assignable: value.assignable, revision: value.revision,
    publishedVersion: version === null ? null : { id: version.id as string, version: version.version as number },
    unavailableReasons: [...value.unavailableReasons] };
}
export function parseTaskPage(value: unknown): { items: TaskSummary[] } | undefined {
  if (!object(value) || !Array.isArray(value.items)) return;
  const items: TaskSummary[] = [];
  const ids = new Set<string>();
  for (const entry of value.items) {
    const task = parseTask(entry);
    if (!task || ids.has(task.id)) return;
    ids.add(task.id);
    items.push(task);
  }
  return { items };
}
export function parseTaskDetail(value: unknown): TaskDetail | undefined {
  const task = parseTask(value);
  return task && object(value) && text(value.purpose) && text(value.pedagogicalNotice) ?
    { ...task, purpose: value.purpose, pedagogicalNotice: value.pedagogicalNotice } : undefined;
}
