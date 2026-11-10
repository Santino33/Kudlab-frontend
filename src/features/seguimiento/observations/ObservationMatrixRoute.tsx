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
import { CourseBack } from '../../academico/groups/Groups';
import type { MatrixDraft } from './matrix.ts';

export function ObservationMatrixRoute({ api, groups, students, consents, drafts, apiOrigin, actorId, groupId, isCurrentSelection }: {
  api: ObservationsApi; groups: GroupsApi; students: StudentsApi; consents: ConsentsApi; drafts: StudentDraftHost;
  apiOrigin: string; actorId: string; groupId: string; isCurrentSelection(): boolean;
}) {
  const scope = `${apiOrigin}:${actorId}:${groupId}:${api.generation()}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const sources = useRef({ groups, students }); sources.current = { groups, students };
  const [ready, setReady] = useState<{ scope: string; group: Group; roster: Student[]; lease: NonNullable<DraftLease>; draft: DraftSlot<MatrixDraft> }>();
  const [retryCapture, setRetryCapture] = useState<ReturnType<StudentDraftHost['capture']>>();
  const [failed, setFailed] = useState(false), [reload, setReload] = useState(0);
  const sequence = useRef(0), mounted = useRef(false);
  const owns = (capture: ReturnType<StudentDraftHost['capture']>) => {
    const now = drafts.capture();
    return isCurrentSelection() && currentScope.current === scope && capture.generation === now.generation && capture.epoch === now.epoch;
  };
  function recheck() {
    if (!mounted.current || !isCurrentSelection() || currentScope.current !== scope || (ready ? !ready.lease.valid() : !retryCapture || !owns(retryCapture))) return;
    if (ready) drafts.suspend();
    setReady(undefined); setFailed(false); setReload(n => n + 1);
  }
  function lost() {
    if (!mounted.current || !isCurrentSelection() || currentScope.current !== scope || !ready?.lease.valid()) return;
    ready.lease.discard(); setReady(undefined); setRetryCapture(drafts.capture()); setFailed(true);
  }
  useEffect(() => {
    mounted.current = true; setReady(undefined);
    const request = new AbortController(), capture = drafts.capture(), count = ++sequence.current;
    const valid = () => !request.signal.aborted && count === sequence.current && owns(capture) && capture.generation === api.generation();
    function fail(denied: boolean) {
      if (!valid()) return;
      if (denied) drafts.discard();
      setRetryCapture(drafts.capture()); setFailed(true);
    }
    void (async () => {
      const group = await sources.current.groups.detail(groupId, request.signal);
      if (!valid()) return;
      if (group.kind !== 'success' || group.data.id !== groupId) {
        fail(group.kind === 'error' && [401, 403, 404].includes(group.status)); return;
      }
      const roster = await sources.current.students.list(request.signal);
      if (!valid()) return;
      if (roster.kind !== 'success' || roster.data.items.some(s => s.groupId !== groupId) || new Set(roster.data.items.map(s => s.id)).size !== roster.data.items.length) {
        fail(roster.kind === 'error' && [401, 403, 404].includes(roster.status)); return;
      }
      const lease = drafts.confirm({ apiOrigin, actorId, role: 'TEACHER', kind: 'observationMatrix', groupId }, capture.generation, capture.epoch);
      if (!lease) return;
      const slot = lease.slot('observationMatrix'), saved = slot.read();
      if (saved && saved.rows.some(r => !roster.data.items.some(s => s.id === r.studentId))) {
        lease.discard(); setRetryCapture(drafts.capture()); setFailed(true); return;
      }
      setReady({ scope, group: group.data, roster: roster.data.items, lease, draft: slot }); setFailed(false);
    })(); return () => { mounted.current = false; request.abort(); };
  }, [api, consents, drafts, apiOrigin, actorId, groupId, scope, reload]);
  return <div className="staff-stack"><CourseBack /><h1 id="auth-title" className="auth-heading [overflow-wrap:anywhere]" tabIndex={-1}>Registrar observaciones</h1>
    {!ready || !isCurrentSelection() || ready.scope !== scope || !ready.lease.valid() ? <div className="space-y-4"><p role="status">{failed ? 'No se pudo comprobar el curso y la pertenencia de sus estudiantes. El borrador no se abrirá sin autorización actual.' : 'Comprobando curso y estudiantes…'}</p>{failed && <Button variant="outline" onClick={recheck}>Reintentar comprobación</Button>}</div> :
      <ObservationMatrix {...{ api, consents, apiOrigin, actorId }} group={ready.group} roster={ready.roster} lease={ready.lease} draft={ready.draft} recheck={recheck} onAccessLost={lost} />}
  </div>;
}
