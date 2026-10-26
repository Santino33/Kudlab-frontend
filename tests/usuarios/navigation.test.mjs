import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';

test('finite direct page routes, with no generic router or permission grant', () => {
  for (const [path, kind] of [['/', 'entry'], ['/acceso', 'access'],
    ['/usuarios', 'accounts'], ['/usuarios/nueva', 'invite'], ['/usuarios/account-1', 'detail'],
    ['/usuarios/account-1/editar', 'edit'], ['/recuperar-acceso', 'recoveryRequest'],
    ['/recuperar-acceso/confirmar', 'recoveryConfirm']]) {
    assert.equal(resolveRoute(path, '').kind, kind);
  }
  assert.deepEqual(resolveRoute('/usuarios/id%20con%20espacio', ''), { kind: 'detail', accountId: 'id con espacio' });
});

test('unknown, malformed and excluded routes never turn into functional transactions', () => {
  for (const path of ['/sesion', '/estudiantes', '/invitaciones/aceptar', '/correo/confirmar', '/usuarios/a/audit',
    '/usuarios/a/reactivate', '/usuarios/a/b/editar', '/usuarios/%E0%A4%A', '/usuarios/%2F', '/usuarios/']) {
    assert.deepEqual(resolveRoute(path, ''), { kind: 'unavailable' });
  }
});

test('any query token outside exact recovery route blocks without classifying or exposing it', () => {
  for (const path of ['/', '/acceso', '/usuarios', '/usuarios/a', '/recuperar-acceso', '/invitaciones/aceptar']) {
    for (const query of ['?token=example', '?token=', '?token=a&token=b']) {
      assert.deepEqual(resolveRoute(path, query), { kind: 'blockedLink' });
    }
  }
  assert.deepEqual(resolveRoute('/recuperar-acceso/confirmar', '?token=example'), { kind: 'recoveryConfirm' });
});
