import { isId, object, type Assignment } from './types.ts';

// Only correlation IDs and confirmed progress persist, never revealed codes or names.
export type CodePreparation = { recipientIds: string[]; requestIds: string[]; nextBatch: number; automatic: boolean };
export const preparationKey = (actorId: string, assignmentId: string) => `kudlab:j03:preparation:${actorId}:${assignmentId}`;

export function newPreparation(recipientIds: string[], automatic = false): CodePreparation {
  return { recipientIds, requestIds: Array.from({ length: Math.ceil(recipientIds.length / 100) }, () => crypto.randomUUID()), nextBatch: 0, automatic };
}
export function parsePreparation(value: unknown, assignment: Assignment): CodePreparation | undefined {
  if (!object(value) || !Array.isArray(value.recipientIds) || !value.recipientIds.length || value.recipientIds.length > 1000 ||
    !value.recipientIds.every(id => isId(id) && assignment.recipients.some(r => r.id === id)) || new Set(value.recipientIds).size !== value.recipientIds.length ||
    !Array.isArray(value.requestIds) || value.requestIds.length !== Math.ceil(value.recipientIds.length / 100) || !value.requestIds.every(isId) || new Set(value.requestIds).size !== value.requestIds.length ||
    !Number.isInteger(value.nextBatch) || Number(value.nextBatch) < 0 || Number(value.nextBatch) > value.requestIds.length || typeof value.automatic !== 'boolean') return;
  return { recipientIds: value.recipientIds, requestIds: value.requestIds, nextBatch: Number(value.nextBatch), automatic: value.automatic };
}
export function readPreparation(storage: Pick<Storage, 'getItem'>, key: string, assignment: Assignment) {
  const raw = storage.getItem(key);
  if (!raw) return;
  const parsed = parsePreparation(JSON.parse(raw), assignment);
  if (!parsed) throw new Error('INVALID_CODE_PREPARATION');
  return parsed;
}
export function savePreparation(storage: Pick<Storage, 'setItem'>, key: string, value: CodePreparation) {
  const { recipientIds, requestIds, nextBatch, automatic } = value;
  storage.setItem(key, JSON.stringify({ recipientIds, requestIds, nextBatch, automatic }));
}
