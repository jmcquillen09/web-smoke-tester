import assert from 'node:assert/strict'
import test from 'node:test'

import { parseOpenApiDocument } from '../e2e/parseOpenApiDocument.ts'
import { planApiOperations } from '../e2e/planApiOperations.ts'

const SWAGGER = {
  swagger: '2.0',
  host: 'api.example',
  basePath: '/v2',
  schemes: ['https'],
  produces: ['application/json'],
  paths: {
    '/pets/{petId}': {
      parameters: [{ $ref: '#/parameters/petId' }],
      get: {
        responses: {
          '200': { description: 'A pet', schema: { $ref: '#/definitions/Pet' } },
          '404': { $ref: '#/responses/Missing' }
        }
      }
    },
    '/orders': {
      get: {
        parameters: [
          { name: 'api_key', in: 'query', required: true, type: 'string', default: 'k' }
        ],
        security: [{ key: [] }],
        responses: { '200': { description: 'Every order' } }
      }
    }
  },
  parameters: { petId: { name: 'petId', in: 'path', required: true, type: 'integer', default: 7 } },
  responses: { Missing: { description: 'No such pet' } },
  definitions: {
    Pet: { type: 'object', properties: { name: { type: 'string', 'x-nullable': true } } }
  },
  securityDefinitions: { key: { type: 'apiKey', in: 'query', name: 'api_key' } }
}

void test('an OpenAPI 3 document is read from JSON', () => {
  const document = {
    openapi: '3.0.3',
    paths: {
      '/pets': {
        get: {
          responses: { '200': { content: { 'application/json': { schema: { type: 'array' } } } } }
        }
      }
    }
  }

  assert.deepEqual(parseOpenApiDocument(JSON.stringify(document)), document)
})

void test('a Swagger 2.0 document plans the requests the OpenAPI 3 document that says the same would', () => {
  const document = parseOpenApiDocument(JSON.stringify(SWAGGER))
  assert.ok(document !== undefined)

  const plan = planApiOperations(document, 'https://api.example/swagger.json')

  assert.deepEqual(plan.operations, [
    {
      method: 'GET',
      path: '/pets/{petId}',
      url: 'https://api.example/v2/pets/7',
      secured: false,
      responses: [
        { status: '200', contentTypes: ['application/json'] },
        { status: '404', contentTypes: [] }
      ],
      bodySchemas: [
        {
          status: '200',
          contentType: 'application/json',
          schema: {
            allOf: [{ $ref: '#/components/schemas/Pet' }],
            components: {
              schemas: {
                Pet: { type: 'object', properties: { name: { type: 'string', nullable: true } } }
              }
            }
          }
        }
      ]
    }
  ])
  assert.deepEqual(plan.skipped, [
    { path: '/orders', reason: 'it requires the credential query parameter "api_key"' }
  ])
})

void test('a text that holds no document is none', () => {
  assert.equal(parseOpenApiDocument('<!doctype html><title>Docs</title>'), undefined)
  assert.equal(parseOpenApiDocument('{"swagger":"1.2","apis":[]}'), undefined)
  assert.equal(parseOpenApiDocument('openapi: 3.0.3\npaths: [unclosed'), undefined)
  assert.equal(parseOpenApiDocument(''), undefined)
})

void test('a Swagger 2.0 document with a malformed operation is no document', () => {
  const malformed = { swagger: '2.0', paths: { '/pets': { get: { parameters: 'petId' } } } }
  const unnamed = { swagger: '2.0', paths: { '/pets': { get: { parameters: [{ in: 'query' }] } } } }

  assert.equal(parseOpenApiDocument(JSON.stringify(malformed)), undefined)
  assert.equal(parseOpenApiDocument(JSON.stringify(unnamed)), undefined)
})
