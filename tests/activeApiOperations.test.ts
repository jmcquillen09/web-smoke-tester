import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { activeApiOperations } from '../e2e/activeApiOperations.ts'
import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { writeApiOperationsFile } from '../e2e/writeApiOperationsFile.ts'

const OPERATION: ApiOperation = {
  method: 'GET',
  path: '/pets/{petId}',
  url: 'https://api.example/pets/7',
  secured: false,
  bodySchemas: [],
  responses: [{ status: '200', contentTypes: ['application/json'] }]
}

const scratchFolder = (): string => mkdtempSync(path.join(tmpdir(), 'api-operations-'))

// A file holding `content` as the runner's operations file would, for a run to be pointed at.
const fileHolding = (content: string): string => {
  const file = path.join(scratchFolder(), 'api-operations.json')
  writeFileSync(file, content)
  return file
}

void test('without an operations file from the runner, a run has no API operation to test', () => {
  assert.deepEqual(activeApiOperations({}), [])
  assert.deepEqual(activeApiOperations({ E2E_API_OPERATIONS_FILE: '' }), [])
})

void test('the operations the runner wrote are the ones a run tests', () => {
  const file = writeApiOperationsFile(scratchFolder(), [OPERATION])

  assert.deepEqual(activeApiOperations({ E2E_API_OPERATIONS_FILE: file }), [OPERATION])
})

void test('a runner that planned no operation hands over none', () => {
  const file = writeApiOperationsFile(scratchFolder(), [])

  assert.deepEqual(activeApiOperations({ E2E_API_OPERATIONS_FILE: file }), [])
})

void test('a file that does not hold the runner’s plan is a configuration error', () => {
  const misshapen = [
    'not json',
    '{}',
    '["/pets"]',
    JSON.stringify([{ ...OPERATION, method: 'DELETE' }]),
    JSON.stringify([{ ...OPERATION, url: '/pets/7' }]),
    JSON.stringify([{ ...OPERATION, headers: {} }])
  ]
  for (const content of misshapen) {
    assert.throws(() => activeApiOperations({ E2E_API_OPERATIONS_FILE: fileHolding(content) }), {
      name: 'E2eConfigurationError'
    })
  }
})

void test('an operations file that is not there is a configuration error naming it', () => {
  const missing = path.join(scratchFolder(), 'gone.json')

  assert.throws(() => activeApiOperations({ E2E_API_OPERATIONS_FILE: missing }), {
    name: 'E2eConfigurationError',
    message: `E2E_API_OPERATIONS_FILE names "${missing}", which is not a readable JSON file.`
  })
})
