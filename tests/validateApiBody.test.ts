import assert from 'node:assert/strict'
import test from 'node:test'

import type { ApiOperation } from '../e2e/ApiOperation.ts'
import { bundleBodySchema } from '../e2e/bundleBodySchema.ts'
import type { ApiBodyValidation } from '../e2e/fixtures/ApiBodyValidation.ts'
import { validateApiBody } from '../e2e/fixtures/validateApiBody.ts'
import type { JsonObject } from '../e2e/JsonObject.ts'

const PET: JsonObject = {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    nickname: { type: 'string', nullable: true, example: 'Rex' },
    born: { type: 'string', format: 'date' },
    owner: { $ref: '#/components/schemas/Owner' }
  }
}
const OWNER: JsonObject = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer' }, pets: { type: 'array', items: PET_REFERENCE() } }
}

function PET_REFERENCE(): JsonObject {
  return { $ref: '#/components/schemas/Pet' }
}

const operationWith = (
  schema: JsonObject,
  openApiVersion = '3.0.3',
  status = '200'
): ApiOperation => ({
  method: 'GET',
  path: '/pets/{petId}',
  url: 'https://api.example/pets/7',
  secured: false,
  responses: [{ status, contentTypes: ['application/json'] }],
  bodySchemas: [
    {
      status,
      contentType: 'application/json',
      schema: bundleBodySchema(schema, { Pet: PET, Owner: OWNER }, openApiVersion)
    }
  ]
})

const validate = (
  operation: ApiOperation,
  body: unknown,
  answer: { status?: number; contentType?: string } = {}
): ApiBodyValidation =>
  validateApiBody({
    operation,
    status: answer.status ?? 200,
    contentType: answer.contentType ?? 'application/json',
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })

void test('a body the schema allows has no problem', () => {
  const operation = operationWith(PET_REFERENCE())

  assert.deepEqual(validate(operation, { id: 7, name: 'Rex', nickname: null, born: 'whenever' }), {
    kind: 'validated',
    problems: []
  })
})

void test('each thing the schema does not allow is listed with where it is', () => {
  const operation = operationWith({ type: 'array', items: PET_REFERENCE() })

  assert.deepEqual(validate(operation, [{ id: 7, name: 'Rex' }, { id: '8' }]), {
    kind: 'validated',
    problems: ["/1 must have required property 'name'", '/1/id must be integer']
  })
  assert.deepEqual(validate(operation, { id: 7 }), {
    kind: 'validated',
    problems: ['the body must be array']
  })
})

void test('schemas that point at one another are followed, around a circle too', () => {
  const operation = operationWith(PET_REFERENCE())
  const body = { id: 7, name: 'Rex', owner: { id: 1, pets: [{ id: 7 }] } }

  assert.deepEqual(validate(operation, body), {
    kind: 'validated',
    problems: ["/owner/pets/0 must have required property 'name'"]
  })
})

void test('an OpenAPI 3.1 schema is read as JSON Schema 2020-12', () => {
  const schema = { type: 'object', properties: { nickname: { type: ['string', 'null'] } } }
  const operation = operationWith(schema, '3.1.0')

  assert.deepEqual(validate(operation, { nickname: null }), { kind: 'validated', problems: [] })
  assert.deepEqual(validate(operation, { nickname: 7 }), {
    kind: 'validated',
    problems: ['/nickname must be string,null']
  })
})

void test('a body that is not JSON, under a JSON content type, is a problem', () => {
  const operation = operationWith(PET_REFERENCE())

  assert.deepEqual(validate(operation, '<p>Rex</p>'), {
    kind: 'validated',
    problems: ['the body is not valid JSON']
  })
})

void test('a long list of problems is cut short, saying how many more there are', () => {
  const operation = operationWith({ type: 'array', items: { type: 'integer' } })
  const body = Array.from({ length: 13 }, () => 'not a number')

  const validation = validate(operation, body)

  assert.equal(validation.kind, 'validated')
  assert.deepEqual(validation.kind === 'validated' ? validation.problems.slice(-2) : [], [
    '/9 must be integer',
    '…and 3 more'
  ])
})

void test('the schema declared for a range or as the default applies to an answer in it', () => {
  const body = { id: 'seven' }

  for (const status of ['4XX', 'default']) {
    assert.deepEqual(
      validate(operationWith(PET_REFERENCE(), '3.0.3', status), body, { status: 404 }),
      {
        kind: 'validated',
        problems: ["the body must have required property 'name'", '/id must be integer']
      }
    )
  }
})

void test('an answer that is not JSON is left unvalidated, saying so', () => {
  const operation = operationWith(PET_REFERENCE())

  assert.deepEqual(validate(operation, '<p>Rex</p>', { contentType: 'text/html' }), {
    kind: 'unvalidated',
    reason: 'the answer is text/html, not JSON'
  })
  assert.deepEqual(validate(operation, '', { contentType: '' }), {
    kind: 'unvalidated',
    reason: 'the answer is of no content type, not JSON'
  })
})

void test('an answer the document declares no schema for is left unvalidated, saying so', () => {
  const operation = operationWith(PET_REFERENCE())

  assert.deepEqual(validate(operation, { error: 'gone' }, { status: 404 }), {
    kind: 'unvalidated',
    reason: 'the document declares no schema for an HTTP 404 answer as application/json'
  })
  assert.deepEqual(validate(operation, {}, { contentType: 'application/problem+json' }), {
    kind: 'unvalidated',
    reason: 'the document declares no schema for an HTTP 200 answer as application/problem+json'
  })
})

void test('a schema a validator cannot read leaves the answer unvalidated, with the reason', () => {
  const unreadable = [
    { type: 'number', minimum: 1, exclusiveMinimum: true },
    { $ref: '#/components/schemas/Gone' }
  ]

  for (const schema of unreadable) {
    const validation = validate(operationWith(schema), 7)

    assert.equal(validation.kind, 'unvalidated')
    assert.match(
      validation.kind === 'unvalidated' ? validation.reason : '',
      /^the document's schema for this answer cannot be used: /
    )
  }
})
