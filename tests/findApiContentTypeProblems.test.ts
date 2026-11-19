import assert from 'node:assert/strict'
import test from 'node:test'

import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { findApiContentTypeProblems } from '../e2e/fixtures/findApiContentTypeProblems.ts'

const operationWith = (responses: ApiOperation['responses']): ApiOperation => ({
  method: 'GET',
  path: '/pets',
  url: 'https://api.example/pets',
  secured: false,
  bodySchemas: [],
  responses
})

const OPERATION = operationWith([
  { status: '200', contentTypes: ['application/json; charset=utf-8', 'application/xml'] },
  { status: '204', contentTypes: [] },
  { status: '4XX', contentTypes: ['application/*'] }
])

void test('a content type the document declares for the answered status has no problem', () => {
  assert.deepEqual(
    findApiContentTypeProblems({
      operation: OPERATION,
      status: 200,
      contentType: 'application/xml',
      body: ''
    }),
    []
  )
  assert.deepEqual(
    findApiContentTypeProblems({
      operation: OPERATION,
      status: 200,
      contentType: 'application/json',
      body: ''
    }),
    []
  )
})

void test('a declared range of types holds every type inside it', () => {
  assert.deepEqual(
    findApiContentTypeProblems({
      operation: OPERATION,
      status: 404,
      contentType: 'application/problem+json',
      body: ''
    }),
    []
  )
})

void test('a content type the document does not declare is listed with the ones it does', () => {
  assert.deepEqual(
    findApiContentTypeProblems({
      operation: OPERATION,
      status: 200,
      contentType: 'text/html',
      body: ''
    }),
    [
      'answered HTTP 200 as text/html; the document declares application/json; charset=utf-8, application/xml'
    ]
  )
  assert.deepEqual(
    findApiContentTypeProblems({ operation: OPERATION, status: 404, contentType: '', body: '' }),
    ['answered HTTP 404 as no content type; the document declares application/*']
  )
})

void test('an answer that names no content type is in no declared range', () => {
  const operation = operationWith([{ status: '200', contentTypes: ['*/*'] }])

  assert.deepEqual(
    findApiContentTypeProblems({ operation, status: 200, contentType: '', body: '' }),
    ['answered HTTP 200 as no content type; the document declares */*']
  )
  assert.deepEqual(
    findApiContentTypeProblems({ operation, status: 200, contentType: 'image/png', body: '' }),
    []
  )
})

void test('a status with no declared body, or not declared at all, is not judged here', () => {
  assert.deepEqual(
    findApiContentTypeProblems({
      operation: OPERATION,
      status: 204,
      contentType: 'text/plain',
      body: ''
    }),
    []
  )
  assert.deepEqual(
    findApiContentTypeProblems({
      operation: OPERATION,
      status: 302,
      contentType: 'text/html',
      body: ''
    }),
    []
  )
})
