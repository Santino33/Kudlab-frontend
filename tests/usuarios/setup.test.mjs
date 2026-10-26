import assert from 'node:assert/strict'
import test from 'node:test'
import { initialState } from '../../src/auth/state.ts'

test('Node 24 imports erasable TypeScript without TSX or aliases', () => {
  assert.equal(Number(process.versions.node.split('.')[0]), 24)
  assert.equal(initialState().kind, 'checking')
})
