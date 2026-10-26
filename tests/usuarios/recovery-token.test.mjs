import test from 'node:test';
import assert from 'node:assert/strict';
import { captureEntry } from '../../src/features/usuarios/navigation.ts';
import { dashboardFeatures } from '../../src/features/usuarios/dashboard.ts';

test('capture only exact recovery; clean URL once, keep token in ephemeral closure, clear on exit', () => {
  const writes = [];
  const entry = captureEntry({ pathname: '/recuperar-acceso/confirmar', search: '?token=synthetic-only', hash: '' }, { replaceState: (...args) => writes.push(args) });
  assert.equal(entry.route.kind, 'recoveryConfirm');
  assert.equal(entry.recovery.read(), 'synthetic-only');
  assert.deepEqual(writes, [[null, '', '/recuperar-acceso/confirmar']]);
  assert.equal(JSON.stringify(entry).includes('synthetic-only'), false);
  entry.recovery.clear();
  assert.equal(entry.recovery.read(), undefined);
  assert.equal(captureEntry({ pathname: '/recuperar-acceso/confirmar', search: '', hash: '' }, { replaceState() {} }).recovery.read(), undefined);
});
test('ambiguous or repeated tokens cannot select a transaction or trigger a mutation', () => {
  for (const pathname of ['/', '/acceso', '/usuarios', '/correo/confirmar']) {
    const entry = captureEntry({ pathname, search: '?token=synthetic-only', hash: '' }, { replaceState() {} });
    assert.equal(entry.route.kind, 'blockedLink');
    assert.equal(entry.recovery.read(), undefined);
  }
  const repeated = captureEntry({ pathname: '/recuperar-acceso/confirmar', search: '?token=a&token=b', hash: '' }, { replaceState() {} });
  assert.equal(repeated.recovery.read(), undefined);
});
test('dashboard descriptors expose only implemented role-specific features', () => {
  assert.deepEqual(dashboardFeatures('TEACHER'), []);
  assert.deepEqual(dashboardFeatures('ADMIN').map(f => f.href), ['/usuarios', '/usuarios/nueva']);
  for (const feature of dashboardFeatures('ADMIN')) assert.ok(feature.title && feature.description);
});
