import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveIndicatorRoute, studentIndicatorsPath } from '../../src/features/indicadores/routes.ts';
import { resolveRoute, routeTitles } from '../../src/features/usuarios/navigation.ts';
const g = '10000000-0000-4000-8000-000000000001', s = '10000000-0000-4000-8000-000000000002';
test('resuelve sus tres rutas exactas', () => {
  assert.deepEqual(resolveRoute('/indicadores', ''), { kind: 'indicatorCatalog' });
  assert.deepEqual(resolveRoute('/indicadores/rt_cv_pct', ''), { kind: 'indicatorDetail', metricCode: 'rt_cv_pct' });
  assert.deepEqual(resolveRoute(studentIndicatorsPath(g, s), ''), { kind: 'studentIndicators', groupId: g, studentId: s });
});
test('ids, códigos y rutas vecinas inválidos no se resuelven como indicadores', () => {
  for (const p of ['/indicadores/iq', '/indicadores/', '/indicadores/rt_cv_pct/x', `/academico/cursos/x/estudiantes/${s}/indicadores`, `/academico/cursos/${g}/estudiantes/${s}/indicadores/`, `/academico/cursos/${g}/estudiantes/../indicadores`])
    assert.equal(resolveIndicatorRoute(p), undefined, p);
  assert.equal(resolveRoute('/indicadores/iq', '').kind, 'unavailable');
});
test('las rutas existentes no cambian y los títulos están completos', () => {
  assert.equal(resolveRoute(`/academico/cursos/${g}/estudiantes/${s}`, '').kind, 'studentDetail');
  assert.equal(resolveRoute(`/academico/cursos/${g}/estudiantes/${s}/tareas`, '').kind, 'studentActivities');
  assert.equal(resolveRoute('/tareas', '').kind, 'tasks'); assert.equal(resolveRoute('/academico/cursos', '').kind, 'groups');
  for (const k of ['indicatorCatalog', 'indicatorDetail', 'studentIndicators']) assert.ok(routeTitles[k]);
});
