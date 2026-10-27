import { object, isId } from './types.ts';
export function acceptsRuntimeMessage(event: { origin: string; source: unknown; data: unknown }, origin: string, source: unknown, bridgeId: string) {
  if (!source || origin === '*' || event.origin !== origin || event.source !== source || !object(event.data) || event.data.bridgeId !== bridgeId) return false;
  const data = event.data, keys = Object.keys(data).sort().join(',');
  if (data.type === 'RUNTIME_READY') return keys === 'bridgeId,type';
  if (data.type === 'RECOVERY_UNAVAILABLE') return keys === 'bridgeId,sessionId,type' && isId(data.sessionId);
  return ['RECOVERY_REQUESTED', 'EXECUTION_FINISHED', 'DELIVERY_PENDING', 'RESULTS_SAVED'].includes(String(data.type)) &&
    keys === 'bridgeId,sessionId,submissionId,type' && isId(data.sessionId) && isId(data.submissionId);
}
