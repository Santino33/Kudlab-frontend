import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';
test('promotion has no route or frontend operation',()=>{
  const api=createUsuariosApi({request(){throw new Error('No request expected');}});
  assert.equal(Object.keys(api).some(name=>/promot|approve|adminRole/i.test(name)),false);
  for(const path of ['/ascensos','/admin-role-requests','/usuarios/any/ascenso']) assert.equal(resolveRoute(path,'').kind,'unavailable');
});
