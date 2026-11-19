import assert from 'node:assert/strict'
import test from 'node:test'

import { activeApiOperations } from '../e2e/activeApiOperations.ts'

const OPERATION = {
  method: 'GET',
  path: '/pets/{petId}',
  url: 'https://api.example/pets/7',
  secured: false,
  responses: [{ status: '200', contentTypes: ['application/json'] }]
}

void test('without operations from the runner, a run has no API operation to test', () => {
  assert.deepEqual(activeApiOperations({}), [])
  assert.deepEqual(activeApiOperations({ E2E_API_OPERATIONS: '' }), [])
})

void test('the operations the runner planned are the ones a run tests', () => {
  const env = { E2E_API_OPERATIONS: JSON.stringify([OPERATION]) }

  assert.deepEqual(activeApiOperations(env), [OPERATION])
})

void test('operations that are not the runner’s plan are a configuration error', () => {
  const misshapen = [
    'not json',
    '{}',
    '["/pets"]',
    JSON.stringify([{ ...OPERATION, method: 'DELETE' }]),
    JSON.stringify([{ ...OPERATION, url: '/pets/7' }]),
    JSON.stringify([{ ...OPERATION, headers: {} }])
  ]
  for (const value of misshapen) {
    assert.throws(() => activeApiOperations({ E2E_API_OPERATIONS: value }), {
      name: 'E2eConfigurationError'
    })
  }
})
