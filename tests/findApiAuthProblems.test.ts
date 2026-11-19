import assert from 'node:assert/strict'
import test from 'node:test'

import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { findApiAuthProblems } from '../e2e/fixtures/findApiAuthProblems.ts'

const operationThatIs = (secured: boolean): ApiOperation => ({
  method: 'GET',
  path: '/account',
  url: 'https://api.example/account',
  secured,
  bodySchemas: [],
  responses: [{ status: '200', contentTypes: ['application/json'] }]
})

const problemsOf = (secured: boolean, status: number): string[] =>
  findApiAuthProblems({
    operation: operationThatIs(secured),
    status,
    contentType: 'application/json',
    body: ''
  })

void test('a secured operation that refuses a request without credentials has no problem', () => {
  assert.deepEqual(problemsOf(true, 401), [])
  assert.deepEqual(problemsOf(true, 403), [])
})

void test('a secured operation that answers a request without credentials is a problem', () => {
  assert.deepEqual(problemsOf(true, 200), [
    'answered HTTP 200 to a request without credentials; the document marks the operation as secured, so it should answer 401 or 403'
  ])
})

void test('any other answer of a secured operation is no refusal either', () => {
  for (const status of [204, 302, 404, 500]) {
    assert.equal(problemsOf(true, status).length, 1, String(status))
  }
})

void test('an operation that is not secured has nothing to refuse', () => {
  assert.deepEqual(problemsOf(false, 200), [])
  assert.deepEqual(problemsOf(false, 401), [])
})
