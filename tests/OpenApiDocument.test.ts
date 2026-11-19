import assert from 'node:assert/strict'
import test from 'node:test'

import { OpenApiDocumentSchema } from '../e2e/OpenApiDocument.ts'
import { planApiOperations } from '../e2e/planApiOperations.ts'

const DOCUMENT_URL = 'https://api.example/openapi.json'
const OK = { '200': { description: 'OK' } }

void test('only an OpenAPI 3 document is a document', () => {
  assert.equal(OpenApiDocumentSchema.safeParse({ openapi: '3.1.0', paths: {} }).success, true)
  assert.equal(OpenApiDocumentSchema.safeParse({ swagger: '2.0', paths: {} }).success, false)
  assert.equal(OpenApiDocumentSchema.safeParse({ openapi: '2.0', paths: {} }).success, false)
  assert.equal(OpenApiDocumentSchema.safeParse({ openapi: '3.0.3' }).success, false)
})

void test('the parts of a document a run does not read are dropped, not refused', () => {
  const parsed = OpenApiDocumentSchema.parse({
    openapi: '3.0.3',
    info: { title: 'Pets' },
    paths: { '/pets': { post: { responses: OK }, get: { summary: 'All pets', responses: OK } } }
  })

  assert.deepEqual(parsed, {
    openapi: '3.0.3',
    paths: { '/pets': { get: { responses: { '200': {} } } } }
  })
})

void test('an example a request cannot carry is no example, so the next one is used', () => {
  const parsed = OpenApiDocumentSchema.parse({
    openapi: '3.0.3',
    paths: {
      '/pets/{petId}': {
        get: {
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              example: { id: 7 },
              schema: { example: ['7'], default: 7 }
            }
          ],
          responses: OK
        }
      },
      '/orders/{orderId}': {
        get: {
          parameters: [{ name: 'orderId', in: 'path', required: true, example: [1, 2] }],
          responses: OK
        }
      }
    }
  })

  const plan = planApiOperations(parsed, DOCUMENT_URL)

  assert.deepEqual(
    plan.operations.map((operation) => operation.url),
    ['https://api.example/pets/7']
  )
  assert.deepEqual(plan.skipped, [
    {
      path: '/orders/{orderId}',
      reason: 'the document gives no example value for its path parameter "orderId"'
    }
  ])
})

void test('a document with a malformed operation is no document', () => {
  const malformed = {
    openapi: '3.0.3',
    paths: { '/pets': { get: { parameters: 'petId', responses: OK } } }
  }

  assert.equal(OpenApiDocumentSchema.safeParse(malformed).success, false)
})

void test('a response’s schema is kept, and one that is not an object is read as none', () => {
  const parsed = OpenApiDocumentSchema.parse({
    openapi: '3.1.0',
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': { schema: { type: 'array', items: { type: 'string' } } },
                'text/plain': { schema: true }
              }
            }
          }
        }
      }
    },
    components: { schemas: { Pet: { type: 'object', nullable: true } } }
  })

  const response = parsed.paths['/pets']?.get?.responses?.['200']
  const content = response !== undefined && 'content' in response ? response.content : undefined

  assert.deepEqual(content?.['application/json']?.schema, {
    type: 'array',
    items: { type: 'string' }
  })
  assert.equal(content?.['text/plain']?.schema, undefined)
  assert.deepEqual(parsed.components?.schemas, { Pet: { type: 'object', nullable: true } })
})
