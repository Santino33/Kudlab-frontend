import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRoute, routeTitles, workspaceNavigation } from '../../src/features/usuarios/navigation.ts';

const groupId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const assignmentId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const recipientId = '55555555-5555-4555-8555-555555555555';

test('every authenticated route has a current label and existing, role-appropriate ancestors', () => {
  const cases = [
    { kind: 'entry' }, { kind: 'access' }, { kind: 'accounts' }, { kind: 'invite' },
    { kind: 'detail', accountId: 'account-example' }, { kind: 'edit', accountId: 'account-example' },
    { kind: 'tasks' }, { kind: 'taskDetail', taskId: 'TG-01' }, { kind: 'groups' }, { kind: 'groupNew' },
    ...['groupDetail', 'groupEdit', 'observationMatrix', 'assignments'].map(kind => ({ kind, groupId })),
    ...['students', 'studentNew', 'studentDetail', 'studentEdit'].flatMap(kind => [{ kind, studentId }, { kind, groupId, studentId }]),
    { kind: 'assignmentDetail', groupId, assignmentId }, { kind: 'supervisedExecution', groupId, assignmentId, recipientId },
    { kind: 'studentActivities', groupId, studentId },
    ...['sessionResults', 'submissionRecovery'].map(kind => ({ kind, groupId, studentId, sessionId })),
    { kind: 'indicatorCatalog' }, { kind: 'indicatorDetail', metricCode: 'attention_accuracy' },
    { kind: 'studentIndicators', groupId, studentId },
  ];
  for (const role of ['ADMIN', 'TEACHER']) for (const route of cases) {
    const location = workspaceNavigation(route, role);
    assert.ok(location.breadcrumbs.length, `${role} ${route.kind}`);
    assert.equal(location.breadcrumbs.at(-1).href, undefined);
    for (const crumb of location.breadcrumbs) {
      assert.ok(crumb.label);
      assert.equal(crumb.label.includes(groupId) || crumb.label.includes(studentId), false);
      if (!crumb.href) continue;
      const ancestor = resolveRoute(crumb.href, '');
      assert.notEqual(ancestor.kind, 'unavailable', crumb.href);
      assert.notEqual(workspaceNavigation(ancestor, role).breadcrumbs[0].label, 'Sección no disponible');
      assert.equal(/[?#]/.test(crumb.href), false);
    }
  }
});

test('Indicators is selected for its three routes, including student context', () => {
  for (const route of [{ kind: 'indicatorCatalog' }, { kind: 'indicatorDetail', metricCode: 'attention_accuracy' }, { kind: 'studentIndicators', groupId, studentId }]) {
    assert.equal(workspaceNavigation(route, 'TEACHER').section, 'indicators');
    assert.equal(workspaceNavigation(route, 'ADMIN').breadcrumbs[0].label, 'Sección no disponible');
  }
  assert.deepEqual(workspaceNavigation({ kind: 'studentIndicators', groupId, studentId }, 'TEACHER').breadcrumbs.map(c => c.label),
    ['Mis cursos', 'Curso', 'Ficha de estudiante', 'Historia de indicadores']);
});

test('denied destinations expose neither ancestors nor identifiers', () => {
  const location = workspaceNavigation({ kind: 'studentIndicators', groupId, studentId }, 'TEACHER', true);
  assert.deepEqual(location, { section: 'home', breadcrumbs: [{ label: 'Sección no disponible' }] });
});

test('account identifiers are encoded in href, never labels; no query or hash is copied', () => {
  const location = workspaceNavigation({ kind: 'edit', accountId: 'name with spaces' }, 'ADMIN');
  assert.equal(location.breadcrumbs[1].href, '/usuarios/name%20with%20spaces');
  assert.deepEqual(location.breadcrumbs.map(c => c.label), ['Profesores', 'Cuenta de profesor', 'Editar cuenta']);
  for (const path of ['/unknown', '/indicadores/not_a_metric']) {
    assert.deepEqual(workspaceNavigation(resolveRoute(path, ''), 'TEACHER').breadcrumbs, [{ label: routeTitles.unavailable }]);
  }
});
