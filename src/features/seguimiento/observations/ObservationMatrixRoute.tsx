import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Group } from '../../academico/groups/types.ts';
import type { GroupsApi } from '../../academico/groups/api.ts';
import type { Student } from '../../academico/students/types.ts';
import type { StudentsApi } from '../../academico/students/api.ts';
import type { ConsentsApi } from '../../academico/consents/api.ts';
import type { DraftLease, DraftSlot, StudentDraftHost } from '../../academico/students/student-drafts.ts';
import type { ObservationsApi } from './api.ts';
import { ObservationMatrix } from './ObservationMatrix';
import type { MatrixDraft } from './matrix.ts';

// Connection-ready route. App/navigation mounting requires the shared composition turn.
export function ObservationMatrixRoute({ api, groups, students, consents, drafts, apiOrigin, actorId, groupId }: {
  api: ObservationsApi; groups: GroupsApi; students: StudentsApi; consents: ConsentsApi; drafts: StudentDraftHost;
  apiOrigin: string; actorId: string; groupId: string;
}) {
  const scope = `${apiOrigin}:${actorId}:${groupId}:${api.generation()}`;
  const [ready, setReady] = useState<{ scope: string; group: Group; roster: Student[]; lease: NonNullable<DraftLease>; draft: DraftSlot<MatrixDraft> }>();
  const [failed, setFailed] = useState(false), [reload, setReload] = useState(0);
  const sequence = useRef(0);
  function recheck() { drafts.suspend(); setReady(undefined); setFailed(false); setReload(n => n + 1); }
  useEffect(() => {
    const request = new AbortController(), capture = drafts.capture(), count = ++sequence.current;
    const valid = () => !request.signal.aborted && count === sequence.current && capture.generation === api.generation();
    void (async () => {
      const group = await groups.detail(groupId, request.signal);
      if (!valid()) return;
      if (group.kind !== 'success' || group.data.id !== groupId) {
        if (group.kind === 'error' && [401, 403, 404].includes(group.status)) drafts.discard();
        setFailed(true); return;
      }
      const roster = await students.list(request.signal);
      if (!valid()) return;
      if (roster.kind !== 'success' || roster.data.items.some(s => s.groupId !== groupId) || new Set(roster.data.items.map(s => s.id)).size !== roster.data.items.length) {
        if (roster.kind === 'error' && [401, 403, 404].includes(roster.status)) drafts.discard();
        setFailed(true); return;
      }
      const lease = drafts.confirm({ apiOrigin, actorId, role: 'TEACHER', kind: 'observationMatrix', groupId }, capture.generation, capture.epoch);
      if (!lease) return;
      const slot = lease.slot('observationMatrix') as DraftSlot<MatrixDraft>, saved = slot.read();
      if (saved && saved.rows.some(r => !roster.data.items.some(s => s.id === r.studentId))) {
        lease.discard(); setFailed(true); return;
      }
      setReady({ scope, group: group.data, roster: roster.data.items, lease, draft: slot }); setFailed(false);
    })(); return () => request.abort();
  }, [api, groups, students, consents, drafts, apiOrigin, actorId, groupId, scope, reload]);
  if (!ready || ready.scope !== scope || !ready.lease.valid()) return <div className="space-y-4"><p role="status">{failed ? 'No se pudo comprobar el curso y la pertenencia de sus estudiantes. El borrador no se abrirá sin autorización actual.' : 'Comprobando curso y estudiantes…'}</p>{failed && <Button variant="outline" onClick={recheck}>Reintentar comprobación</Button>}</div>;
  return <ObservationMatrix {...{ api, consents, apiOrigin, actorId }} group={ready.group} roster={ready.roster} lease={ready.lease} draft={ready.draft} recheck={recheck} />;
}
