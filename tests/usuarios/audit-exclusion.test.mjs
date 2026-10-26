import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';
test('visible audit has no route or frontend operation',()=>{
  const api=createUsuariosApi({request(){throw new Error('No request expected');}});
  assert.equal(Object.keys(api).some(name=>/audit|history/i.test(name)),false);
  for(const path of ['/usuarios/any/audit','/usuarios/any/historial']) assert.equal(resolveRoute(path,'').kind,'unavailable');
});
