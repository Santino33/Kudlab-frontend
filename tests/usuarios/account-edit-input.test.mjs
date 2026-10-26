import test from 'node:test';
import assert from 'node:assert/strict';
import { accountIssues,editFields,parseAccount } from '../../src/features/usuarios/types.ts';

test('pending email stays distinct, and unchanged active email is omitted from a name-only edit',()=>{
  const current={id:'business',name:'Profesora',email:'a@pilot.edu.co',pendingEmail:'b@pilot.edu.co',role:'TEACHER',status:'ACTIVA',createdAt:'2026-10-26T00:00:00Z'};
  assert.equal(parseAccount(current).email,'a@pilot.edu.co');
  assert.deepEqual(editFields(current,'Nuevo nombre','a@pilot.edu.co'),{name:'Nuevo nombre'});
  assert.deepEqual(editFields(current,current.name,current.email),{});
  assert.ok(accountIssues('x'.repeat(201),current.email).name);
});
