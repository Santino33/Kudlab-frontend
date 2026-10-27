import assert from 'node:assert/strict';
import test from 'node:test';
import { recoveryPasswordIssues } from '../../src/features/usuarios/recovery/recovery-input.ts';

test('recovery accepts a matching password without transforming its value', () => {
  assert.deepEqual(recoveryPasswordIssues('Correcta123', 'Correcta123'), {});
  assert.deepEqual(recoveryPasswordIssues(' Correcta123 ', ' Correcta123 '), {});
});
test('recovery distinguishes empty confirmation from mismatch', () => {
  assert.equal(recoveryPasswordIssues('Correcta123', '').confirmation, 'Vuelve a escribir tu nueva contraseña.');
  assert.equal(recoveryPasswordIssues('Correcta123', 'Otra12345').confirmation, 'Las contraseñas deben coincidir.');
});
test('new credential policy remains 8–128 with ASCII upper/lower/digit', () => {
  for (const password of ['', 'Aa12345', 'a'.repeat(8), 'Ábcdefg1', 'ABCDEFG1', 'Abcdefgh', 'Aa1'+'x'.repeat(126)]) {
    assert.ok(recoveryPasswordIssues(password, password).password);
  }
});
