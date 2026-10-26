import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';

for (const status of [400,410,503]) test(`recovery ${status} never retries or starts a session`,async()=>{
  const calls=[];
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async(url,init)=>{
    calls.push([url,init.method]);return Response.json({code:status===410?'VERIFICATION_EXPIRED':'INVALID_INPUT'},{status});
  }));
  const result=await api.confirmRecovery('synthetic-only','Valida123',new AbortController().signal);
  assert.equal(result.kind,'error');assert.equal(result.status,status);
  assert.equal(result.uncertain,status===503);
  assert.deepEqual(calls,[['http://localhost:3000/api/v1/auth/password-recovery/confirm','POST']]);
});
test('public 202 without a message and 200 without exact success are unavailable',async()=>{
  const make=(status,body)=>createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async()=>Response.json(body,{status})));
  assert.equal((await make(202,{}).requestRecovery('a@pilot.edu.co',new AbortController().signal)).kind,'unavailable');
  assert.equal((await make(200,{success:1}).confirmRecovery('synthetic','Valida123',new AbortController().signal)).kind,'unavailable');
});
for(const status of [400,503]) test(`request ${status} has a safe error without retries`,async()=>{
  let calls=0;
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async()=>{calls++;return Response.json({code:'INVALID_INPUT',message:'untrusted'},{status});}));
  const result=await api.requestRecovery('a@pilot.edu.co',new AbortController().signal);
  assert.equal(result.kind,'error');assert.equal(JSON.stringify(result).includes('untrusted'),false);assert.equal(calls,1);
});
