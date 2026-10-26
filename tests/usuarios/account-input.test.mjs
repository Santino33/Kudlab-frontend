import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAccount, parseAccountPage, accountIssues, editFields, validNewPassword, validInstitutionalEmail } from '../../src/features/usuarios/types.ts';

const account = { id: 'business-id', name: 'Profesora', email: 'profesora@pilot.edu.co', role: 'TEACHER', status: 'PENDIENTE', createdAt: '2026-10-26T00:00:00Z' };
test('Account filters extras and keeps optional delivery/email separate from identity', () => {
  assert.deepEqual(parseAccount({ ...account, authUserId: 'not-an-account-id', token: 'discard' }), account);
  for (const status of ['PENDIENTE', 'ACTIVA', 'INACTIVA']) assert.equal(parseAccount({ ...account, status }).status, status);
  for (const deliveryStatus of ['PENDIENTE', 'ENVIADA', 'ERROR']) assert.equal(parseAccount({ ...account, deliveryStatus }).deliveryStatus, deliveryStatus);
  assert.equal(parseAccount(account).deliveryStatus, undefined);
  assert.equal(parseAccount({ ...account, pendingEmail: 'otro@pilot.edu.co' }).email, account.email);
  for (const key of Object.keys(account)) { const bad = { ...account }; delete bad[key]; assert.equal(parseAccount(bad), undefined); }
  for (const bad of [{ role: 'STUDENT' }, { status: 'UNKNOWN' }, { deliveryStatus: 'UNKNOWN' }, { createdAt: 'invalid' }, { pendingEmail: 2 }]) assert.equal(parseAccount({ ...account, ...bad }), undefined);
});
test('paginated response requires counts and well-formed items', () => {
  const page = { items: [account], total: 1, limit: 20, offset: 0 };
  assert.deepEqual(parseAccountPage(page), page);
  for (const bad of [{ total: -1 }, { offset: -1 }, { limit: 0 }, { items: [{}] }]) assert.equal(parseAccountPage({ ...page, ...bad }), undefined);
});
test('name 1–200 and institutional email; no client uniqueness or account eligibility rules', () => {
  assert.deepEqual(accountIssues('Nombre', 'persona@pilot.edu.co'), {});
  assert.ok(accountIssues(' ', 'bad').name);
  assert.ok(accountIssues('n'.repeat(201), 'persona@gmail.com').email);
  assert.ok(accountIssues('n'.repeat(201), account.email).name);
  assert.equal(validInstitutionalEmail(account.email), true);
  assert.equal(validInstitutionalEmail('a@edu.co'), false);
});
test('edit selects only changed name/email, never silently reissues email or replaces current email', () => {
  assert.deepEqual(editFields(account, 'Otro nombre', account.email), { name: 'Otro nombre' });
  assert.deepEqual(editFields(account, account.name, 'otro@pilot.edu.co'), { email: 'otro@pilot.edu.co' });
  assert.deepEqual(editFields(account, account.name, account.email), {});
});
test('new password policy is distinct from existing login password', () => {
  assert.equal(validNewPassword('Valida123'), true);
  for (const value of ['', 'Aa1', 'onlylowercase1', 'ONLYUPPERCASE1', 'SinNumeros', 'A1'+'a'.repeat(127)]) assert.equal(validNewPassword(value), false);
});
