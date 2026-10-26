import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';

test('last ADMIN remains a server rejection; only explicit deactivate/demote bodies exist',async()=>{
  const calls=[];
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async(url,init)=>{
    calls.push([url,init.method,JSON.parse(init.body)]);return Response.json({code:'LAST_ADMIN'},{status:409});
  }));
  const signal=new AbortController().signal;
  for(const result of [await api.deactivateAccount('business',signal),await api.demoteAccount('business',signal)]){
    assert.equal(result.kind,'error');assert.equal(result.code,'LAST_ADMIN');assert.equal(result.uncertain,false);
  }
  assert.deepEqual(calls,[['http://localhost:3000/api/v1/accounts/business/deactivate','POST',{confirm:true}],['http://localhost:3000/api/v1/accounts/business/role','PUT',{role:'TEACHER'}]]);
  assert.equal('reactivateAccount' in api,false);
});
for(const method of ['deactivateAccount','demoteAccount']) for(const status of [401,403,503]) test(`${method} ${status} keeps possible persistence without replay`,async()=>{
  let calls=0;
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async()=>{calls++;return Response.json({code:'UNAUTHENTICATED'},{status});}));
  const result=await api[method]('business',new AbortController().signal);
  assert.equal(result.uncertain,true);assert.equal(calls,1);
});
