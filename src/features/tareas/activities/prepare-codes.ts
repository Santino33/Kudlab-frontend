import type { ActivitiesApi } from './api.ts';
import type { Assignment } from './types.ts';
import type { HttpResult } from '../../usuarios/types.ts';

export async function prepareCodes(api: ActivitiesApi, assignment: Assignment, requestId: (batch: number) => string, signal: AbortSignal): Promise<HttpResult<Assignment>> {
  for (let offset = 0; offset < assignment.recipients.length; offset += 100) {
    const result = await api.generateCodes(assignment.id, requestId(offset / 100), assignment.recipients.slice(offset, offset + 100).map(r => r.id), signal);
    if (result.kind !== 'success') return result;
  }
  return { kind: 'success', data: assignment };
}
