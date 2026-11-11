import type { AuthController } from '../../../auth/controller.ts';
import type { HttpClient } from '../../../lib/http.ts';
import type { HttpResult } from '../../usuarios/types.ts';
import { conflictKeys, decodeNoteFields, isUuid, normalizeScore, parseNote, parseNotesList } from './types.ts';
import type { Note, NoteField, NotesList, Subject, Term } from './types.ts';

type Access = Pick<AuthController, 'getGeneration' | 'notify'>;

// Copia local mínima (MSG-integrador-010): reenvía 401/403 reales, delega getGeneration de forma dinámica y
// NO reenvía `unavailable`, para que un fallo de red o un 5xx quede en la sección y no desmonte la ficha.
export function localNotesAccess(controller: Access): Access {
  return {
    getGeneration: () => controller.getGeneration(),
    notify(denial) { if (denial.category !== 'unavailable') controller.notify(denial); },
  };
}

export type NoteConflict = 'exists' | 'inactive' | 'stale';
// Clasifica un 409 por su combinación cerrada de campo y razón; cualquier otra cosa no es un conflicto conocido.
export function noteConflict(result: HttpResult<unknown, NoteField>): NoteConflict | undefined {
  if (result.kind !== 'error' || result.status !== 409 || result.code !== 'CONFLICT' || result.fields?.length !== 1) return;
  const reason = result.fields[0]!.reason;
  return (Object.entries(conflictKeys) as [NoteConflict, string][]).find(([, text]) => text === reason)?.[0];
}

export function createNotesApi(http: HttpClient) {
  const missing = () => Promise.resolve({ kind: 'error' as const, status: 404, code: 'NOT_FOUND' as const, uncertain: false });
  const base = (studentId: string) => `/api/v1/students/${studentId}/academic-notes`;
  return {
    list(studentId: string, signal: AbortSignal): Promise<HttpResult<NotesList, NoteField>> {
      if (!isUuid(studentId)) return missing();
      return http.request<NotesList, NoteField>(base(studentId), { signal, decodeFields: decodeNoteFields,
        decode: (data, status) => (status === 200 ? parseNotesList(data) : undefined) });
    },
    create(studentId: string, input: { subject: Subject; term: Term; scoreText: string }, signal: AbortSignal): Promise<HttpResult<Note, NoteField>> {
      if (!isUuid(studentId)) return missing();
      const score = input.scoreText.trim();
      return http.request<Note, NoteField>(base(studentId), { method: 'POST', body: { subject: input.subject, term: input.term, score },
        signal, decodeFields: decodeNoteFields, decode: (data, status) => {
          const note = status === 201 ? parseNote(data) : undefined;
          return note && note.subject === input.subject && note.term === input.term && note.score === normalizeScore(score) ? note : undefined;
        } });
    },
    update(studentId: string, before: Note, scoreText: string, signal: AbortSignal): Promise<HttpResult<Note, NoteField>> {
      if (!isUuid(studentId) || !isUuid(before.id)) return missing();
      const score = scoreText.trim();
      return http.request<Note, NoteField>(`${base(studentId)}/${before.id}`, { method: 'PATCH',
        body: { score, expectedVersion: before.version }, signal, decodeFields: decodeNoteFields, decode: (data, status) => {
          const note = status === 200 ? parseNote(data) : undefined;
          return note && note.id === before.id && note.subject === before.subject && note.term === before.term &&
            note.score === normalizeScore(score) ? note : undefined;
        } });
    },
  };
}
export type NotesApi = ReturnType<typeof createNotesApi>;
