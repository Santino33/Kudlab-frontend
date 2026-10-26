import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsuariosApi } from '../../src/features/usuarios/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';

test('edit strips extra privilege fields and conflict preserves a rejection rather than an optimistic success',async()=>{
  let body,calls=0;
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async(_url,init)=>{
    calls++;body=JSON.parse(init.body);return Response.json({code:'CONFLICT'},{status:409});
  }));
  const result=await api.updateAccount('business',{name:'Nuevo',role:'ADMIN',status:'ACTIVA'},new AbortController().signal);
  assert.deepEqual(body,{name:'Nuevo'});assert.equal(calls,1);assert.equal(result.kind,'error');assert.equal(result.uncertain,false);
});
for(const [status,code] of [[400,'INVALID_INPUT'],[401,'UNAUTHENTICATED'],[403,'FORBIDDEN'],[503,'DELIVERY_FAILED']]) test(`edit ${code} never assumes rollback or repeats`,async()=>{
  let calls=0;
  const api=createUsuariosApi(createHttpClient('http://localhost:3000',{getGeneration:()=>0,notify(){}},async()=>{calls++;return Response.json({code},{status});}));
  const result=await api.updateAccount('business',{email:'nuevo@pilot.edu.co'},new AbortController().signal);
  assert.equal(result.kind,'error');assert.equal(result.uncertain,status!==400);assert.equal(calls,1);
});
