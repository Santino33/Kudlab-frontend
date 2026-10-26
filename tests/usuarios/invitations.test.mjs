import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';
import { resolveRoute } from '../../src/features/usuarios/navigation.ts';

for (const code of ['DELIVERY_FAILED','DELIVERY_STATUS_UNKNOWN']) test(`reissue ${code} is uncertain and never calls accept/resend`, async()=>{
  const calls=[];
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>1,notify(){}},async(url,init)=>{
    calls.push([url,init.method,JSON.parse(init.body)]);return Response.json({code},{status:503});
  }));
  const result=await api.reissueInvitation({id:'account',email:'a@pilot.edu.co'},new AbortController().signal);
  assert.equal(result.uncertain,true);
  assert.deepEqual(calls,[['http://localhost:3000/api/v1/accounts/account','PATCH',{email:'a@pilot.edu.co'}]]);
  assert.equal(resolveRoute('/','?token=synthetic').kind,'blockedLink');
});
