import type { AuthController } from '../../../auth/controller.ts';
import type { HttpClient } from '../../../lib/http.ts';
import type { HttpResult } from '../../usuarios/types.ts';
import { annotationId, decodeAnnotationFields, parseAnnotation, parseAnnotationDeleted, parseAnnotationsList } from './types.ts';
import type { Annotation, AnnotationDeleted, AnnotationField, AnnotationsList } from './types.ts';

export function localAnnotationsAccess(controller: Pick<AuthController, 'getGeneration' | 'notify'>) {
  return { getGeneration: () => controller.getGeneration(),
    notify(event: Parameters<AuthController['notify']>[0]) { if (event.category !== 'unavailable') controller.notify(event); } };
}

export function createAnnotationsApi(http: HttpClient) {
  const base = '/api/v1/student-annotations';
  const missing = () => Promise.resolve({ kind: 'error' as const, status: 404, code: 'NOT_FOUND' as const, uncertain: false });
  return {
    list(studentId: string, signal: AbortSignal, cursor?: string): Promise<HttpResult<AnnotationsList, AnnotationField>> {
      if (!annotationId(studentId)) return missing();
      const query = new URLSearchParams({ studentId });
      if (cursor) query.set('cursor', cursor);
      return http.request(`${base}?${query}`, { signal, decodeFields: decodeAnnotationFields,
        decode(data, status) { const result = status === 200 ? parseAnnotationsList(data) : undefined;
          return result?.studentId === studentId ? result : undefined; } });
    },
    create(studentId: string, text: string, signal: AbortSignal): Promise<HttpResult<Annotation, AnnotationField>> {
      if (!annotationId(studentId)) return missing();
      return http.request(base, { method: 'POST', body: { studentId, text }, signal, decodeFields: decodeAnnotationFields,
        decode(data, status) { const result = status === 201 ? parseAnnotation(data) : undefined;
          return result?.studentId === studentId && result.text === text ? result : undefined; } });
    },
    update(before: Annotation, text: string, signal: AbortSignal): Promise<HttpResult<Annotation, AnnotationField>> {
      if (!annotationId(before.id) || !annotationId(before.studentId)) return missing();
      return http.request(`${base}/${before.id}`, { method: 'PATCH', body: { text }, signal, decodeFields: decodeAnnotationFields,
        decode(data, status) { const result = status === 200 ? parseAnnotation(data) : undefined;
          return result?.id === before.id && result.studentId === before.studentId && result.text === text &&
            result.author.id === before.author.id && result.createdAt === before.createdAt && result.updatedAt !== null ? result : undefined; } });
    },
    remove(before: Annotation, signal: AbortSignal): Promise<HttpResult<AnnotationDeleted, AnnotationField>> {
      if (!annotationId(before.id) || !annotationId(before.studentId)) return missing();
      return http.request(`${base}/${before.id}`, { method: 'DELETE', bodyAbsent: true, signal, decodeFields: decodeAnnotationFields,
        decode(data, status) { const result = status === 200 ? parseAnnotationDeleted(data) : undefined;
          return result?.id === before.id && result.studentId === before.studentId ? result : undefined; } });
    },
  };
}
export type AnnotationsApi = ReturnType<typeof createAnnotationsApi>;
