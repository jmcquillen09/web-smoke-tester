import assert from 'node:assert/strict'
import test from 'node:test'

import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { findApiStatusProblems } from '../e2e/fixtures/findApiStatusProblems.ts'

const operationWith = (statuses: readonly string[], secured = false): ApiOperation => ({
  method: 'GET',
  path: '/pets',
  url: 'https://api.example/pets',
  secured,
  bodySchemas: [],
  responses: statuses.map((status) => ({ status, contentTypes: [] }))
})

const problemsOf = (operation: ApiOperation, status: number): string[] =>
  findApiStatusProblems({ operation, status, contentType: 'application/json', body: '' })

void test('a status the document declares by code, range or default has no problem', () => {
  assert.deepEqual(problemsOf(operationWith(['200', '404']), 404), [])
  assert.deepEqual(problemsOf(operationWith(['2xx']), 204), [])
  assert.deepEqual(problemsOf(operationWith(['200', 'default']), 418), [])
})

void test('a status the document does not declare is listed with the ones it does', () => {
  assert.deepEqual(problemsOf(operationWith(['200', '404']), 302), [
    'answered HTTP 302, which the document does not declare (declared: 200, 404)'
  ])
  assert.deepEqual(problemsOf(operationWith([]), 200), [
    'answered HTTP 200, which the document does not declare (declared: none)'
  ])
})

void test('a server error is a problem even when the document declares it', () => {
  assert.deepEqual(problemsOf(operationWith(['200', '500', 'default']), 500), [
    'answered HTTP 500, a server error'
  ])
})

void test('only a secured operation may refuse a run for its missing credentials', () => {
  assert.deepEqual(problemsOf(operationWith(['200'], true), 401), [])
  assert.deepEqual(problemsOf(operationWith(['200'], true), 403), [])
  assert.deepEqual(problemsOf(operationWith(['200']), 401), [
    'answered HTTP 401, which the document does not declare (declared: 200)'
  ])
})
