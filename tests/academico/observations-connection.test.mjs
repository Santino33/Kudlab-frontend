import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudentDraftHost } from '../../src/features/academico/students/student-drafts.ts';
import { resolveRoute, routeTitles, canManageStudents } from '../../src/features/usuarios/navigation.ts';
import { observationMatrixPath } from '../../src/features/seguimiento/observations/navigation.ts';
import { emptyForm } from '../../src/features/seguimiento/observations/types.ts';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const selection = { apiOrigin: 'http://localhost:3000', actorId: id(1), role: 'TEACHER', kind: 'student', studentId: id(2), groupId: id(3) };
const single = () => ({ form: { ...emptyForm(), behavior: 'ATTENTION' }, attempts: [] });
const matrix = () => ({ form: { ...emptyForm(), behavior: 'FOLLOWING_INSTRUCTIONS' }, attempts: [], rows: [], frozen: false });
function setup() {
  let state = { kind: 'authenticated', user: { id: id(1), role: 'TEACHER' }, generation: 1, denied: false };
  const host = createStudentDraftHost({ getSnapshot: () => state, getGeneration: () => state.generation });
  return { host, set(value) { state = value; }, state: () => state, confirm(key = selection) { const c = host.capture(); return host.confirm(key, c.generation, c.epoch); } };
}
test('T-16 preparación: resolvedor global reconoce matriz docente, conserva token bloqueado y rutas previas', () => {
  assert.deepEqual(resolveRoute(observationMatrixPath(id(3)), ''), { kind: 'observationMatrix', groupId: id(3) });
  assert.equal(routeTitles.observationMatrix, 'Registrar observaciones');
  assert.equal(resolveRoute(observationMatrixPath(id(3)), '?token=synthetic').kind, 'blockedLink');
  assert.equal(resolveRoute('/academico/cursos/%GG/observaciones', '').kind, 'unavailable');
  assert.equal(resolveRoute(`/academico/cursos/${id(3)}/estudiantes/${id(2)}`, '').kind, 'studentDetail');
  assert.equal(resolveRoute(`/academico/cursos/${id(3)}/editar`, '').kind, 'groupEdit');
  assert.equal(canManageStudents({ kind: 'authenticated', user: { role: 'ADMIN' }, denied: false }), false);
});
test('T-14/CA-07/09: suspension quarantines both typed slots before cleanup and fresh same scope alone restores', () => {
  const s = setup(), lease = s.confirm(), slot = lease.slot('observations');
  const value = single(); slot.write(value);
  lease.onStop(() => { assert.equal(slot.read(), undefined); slot.write(undefined); });
  s.host.suspend();
  s.set({ ...s.state(), generation: 2 }); const restored = s.confirm().slot('observations');
  assert.equal(restored.read(), value); slot.write(single()); lease.discard(); assert.equal(restored.read(), value);
  const m = s.confirm({ ...selection, kind: 'observationMatrix' }); m.slot('observationMatrix').write(matrix());
  s.host.suspend(); s.set({ ...s.state(), generation: 3 });
  const fresh = s.confirm({ ...selection, kind: 'observationMatrix' });
  assert.equal(fresh.slot('observationMatrix').read().form.behavior, 'FOLLOWING_INSTRUCTIONS');
  m.slot('observationMatrix').write(undefined); m.discard(); assert.ok(fresh.slot('observationMatrix').read());
});
test('T-14/CA-08/09: same-generation selection changes invalidate all old handles and captured epochs', () => {
  const s = setup(), old = s.confirm(); old.slot('observations').write(single()); const captured = s.host.capture();
  const next = s.confirm({ ...selection, kind: 'observationMatrix' }), value = matrix(); next.slot('observationMatrix').write(value);
  assert.equal(s.host.confirm(selection, captured.generation, captured.epoch), undefined);
  assert.equal(old.valid(), false); old.slot('observations').write(undefined); old.discard();
  assert.equal(next.slot('observationMatrix').read(), value);
  const changed = s.confirm({ ...selection, studentId: id(4) }); changed.slot('observations').write(single());
  next.slot('observationMatrix').write(undefined); next.discard(); assert.ok(changed.slot('observations').read());
});
test('T-14/CA-08: actor, role, origin, course and denial cannot inherit the previous payload', () => {
  for (const scenario of ['actor', 'role', 'origin', 'group', 'denial', 'signout']) {
    const s = setup(), old = s.confirm(); old.slot('observations').write(single());
    let key = { ...selection };
    if (scenario === 'actor') { s.set({ ...s.state(), user: { id: id(5), role: 'TEACHER' } }); key.actorId = id(5); }
    if (scenario === 'role') s.set({ ...s.state(), user: { id: id(1), role: 'ADMIN' } });
    if (scenario === 'origin') key.apiOrigin = 'http://localhost:3001';
    if (scenario === 'group') key.groupId = id(6);
    if (scenario === 'denial') s.set({ ...s.state(), denied: true });
    if (scenario === 'signout') s.set({ kind: 'signingOut', generation: 2 });
    s.host.sync();
    const next = s.confirm(key); assert.equal(next?.slot('observations').read(), undefined, scenario);
  }
});
test('T-14/CA-09: re-confirming same selection on refresh does not discard its payload or stop its lease', () => {
  const s = setup(), lease = s.confirm(), value = single(); let stops = 0;
  lease.slot('observations').write(value); lease.onStop(() => stops++);
  for (let n = 0; n < 3; n++) assert.equal(s.confirm().slot('observations').read(), value);
  assert.equal(lease.valid(), true); assert.equal(stops, 0);
});
