// Context/identity/generation live in the shared host, not in this producer payload.
export type AnnotationDraft = { text: string; annotationId?: string; mode: 'create' | 'edit'; focus?: 'text'; uncertain?: boolean };

export function parseAnnotationDraft(value: unknown): AnnotationDraft | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const draft = value as Record<string, unknown>;
  if ((draft.mode !== 'create' && draft.mode !== 'edit') || typeof draft.text !== 'string' ||
    draft.mode === 'edit' && typeof draft.annotationId !== 'string' || draft.mode === 'create' && draft.annotationId !== undefined ||
    draft.focus !== undefined && draft.focus !== 'text' || draft.uncertain !== undefined && typeof draft.uncertain !== 'boolean' ||
    Object.keys(draft).some(key => !['text', 'annotationId', 'mode', 'focus', 'uncertain'].includes(key))) return;
  return draft as AnnotationDraft;
}
