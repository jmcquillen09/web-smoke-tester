import assert from 'node:assert/strict'
import test from 'node:test'

import { convertSwaggerDocument } from '../e2e/convertSwaggerDocument.ts'
import { type SwaggerDocument, SwaggerDocumentSchema } from '../e2e/SwaggerDocument.ts'

const NO_COMPONENTS = { parameters: {}, responses: {}, schemas: {}, securitySchemes: {} }

const swaggerOf = (parts: object): SwaggerDocument =>
  SwaggerDocumentSchema.parse({ swagger: '2.0', paths: {}, ...parts })

void test('the host, base path and schemes become one server for each scheme', () => {
  const converted = convertSwaggerDocument(
    swaggerOf({ host: 'api.example:8443', basePath: '/v2', schemes: ['https', 'http'] })
  )

  assert.deepEqual(converted['servers'], [
    { url: 'https://api.example:8443/v2' },
    { url: 'http://api.example:8443/v2' }
  ])
})

void test('a document that names no scheme or no host leaves them to its own address', () => {
  assert.deepEqual(
    convertSwaggerDocument(swaggerOf({ host: 'api.example', basePath: '/v2' }))['servers'],
    [{ url: '//api.example/v2' }]
  )
  assert.deepEqual(
    convertSwaggerDocument(swaggerOf({ basePath: '/v2', schemes: ['https'] }))['servers'],
    [{ url: '/v2' }]
  )
  assert.deepEqual(convertSwaggerDocument(swaggerOf({}))['servers'], [{ url: '/' }])
})

void test('a parameter’s own default, enum and x-example become its schema and example', () => {
  const converted = convertSwaggerDocument(
    swaggerOf({
      paths: {
        '/pets': {
          get: {
            parameters: [
              { name: 'sort', in: 'query', required: true, type: 'string', enum: ['name', 'age'] },
              { name: 'limit', in: 'query', type: 'integer', default: 20, 'x-example': 5 }
            ]
          }
        }
      }
    })
  )

  assert.deepEqual(converted['paths'], {
    '/pets': {
      parameters: [],
      get: {
        parameters: [
          {
            name: 'sort',
            in: 'query',
            required: true,
            type: 'string',
            enum: ['name', 'age'],
            schema: { enum: ['name', 'age'] }
          },
          {
            name: 'limit',
            in: 'query',
            type: 'integer',
            default: 20,
            example: 5,
            schema: { default: 20 }
          }
        ],
        responses: {}
      }
    }
  })
})

void test('a response’s schema is its body in each content type the operation answers in', () => {
  const pets = { type: 'array', items: { type: 'string' } }
  const converted = convertSwaggerDocument(
    swaggerOf({
      produces: ['application/json'],
      paths: {
        '/pets': { get: { responses: { '200': { schema: pets }, '204': {} } } },
        '/pets.csv': {
          get: { produces: ['text/csv', 'text/plain'], responses: { '200': { schema: pets } } }
        }
      }
    })
  )

  assert.deepEqual(converted['paths'], {
    '/pets': {
      parameters: [],
      get: {
        parameters: [],
        responses: { '200': { content: { 'application/json': { schema: pets } } }, '204': {} }
      }
    },
    '/pets.csv': {
      parameters: [],
      get: {
        parameters: [],
        responses: {
          '200': { content: { 'text/csv': { schema: pets }, 'text/plain': { schema: pets } } }
        }
      }
    }
  })
})

void test('a body in a document that names no content type may come in any', () => {
  const converted = convertSwaggerDocument(
    swaggerOf({ responses: { Pets: { schema: { type: 'array' } } } })
  )

  assert.deepEqual(converted['components'], {
    ...NO_COMPONENTS,
    responses: { Pets: { content: { '*/*': { schema: { type: 'array' } } } } }
  })
})

void test('every $ref points at where an OpenAPI 3 document keeps the definition', () => {
  const converted = convertSwaggerDocument(
    swaggerOf({
      paths: {
        '/pets/{petId}': {
          parameters: [{ $ref: '#/parameters/petId' }],
          get: {
            responses: {
              '200': { schema: { $ref: '#/definitions/Pet' } },
              '404': { $ref: '#/responses/Missing' }
            }
          }
        }
      },
      definitions: {
        Pet: { type: 'object', properties: { owner: { $ref: '#/definitions/Owner' } } },
        Owner: { type: 'object', example: { $ref: '#/definitions/Pet' } }
      }
    })
  )

  assert.deepEqual(converted['paths'], {
    '/pets/{petId}': {
      parameters: [{ $ref: '#/components/parameters/petId' }],
      get: {
        parameters: [],
        responses: {
          '200': { content: { '*/*': { schema: { $ref: '#/components/schemas/Pet' } } } },
          '404': { $ref: '#/components/responses/Missing' }
        }
      }
    }
  })
  assert.deepEqual(converted['components'], {
    ...NO_COMPONENTS,
    schemas: {
      Pet: { type: 'object', properties: { owner: { $ref: '#/components/schemas/Owner' } } },
      Owner: { type: 'object', example: { $ref: '#/definitions/Pet' } }
    }
  })
})

void test('a schema’s x-nullable is the nullable an OpenAPI 3.0 schema writes', () => {
  const converted = convertSwaggerDocument(
    swaggerOf({
      definitions: { Pet: { properties: { name: { type: 'string', 'x-nullable': true } } } }
    })
  )

  assert.equal(converted['openapi'], '3.0.3')
  assert.deepEqual(converted['components'], {
    ...NO_COMPONENTS,
    schemas: { Pet: { properties: { name: { type: 'string', nullable: true } } } }
  })
})

void test('security is carried over, an operation’s own only where it names one', () => {
  const security = [{ key: [] }]
  const securityDefinitions = { key: { type: 'apiKey', in: 'query', name: 'api_key' } }
  const converted = convertSwaggerDocument(
    swaggerOf({
      security,
      securityDefinitions,
      paths: { '/open': { get: { security: [] } }, '/pets': { get: {} } }
    })
  )

  assert.deepEqual(converted['security'], security)
  assert.deepEqual(converted['paths'], {
    '/open': { parameters: [], get: { parameters: [], responses: {}, security: [] } },
    '/pets': { parameters: [], get: { parameters: [], responses: {} } }
  })
  assert.deepEqual(converted['components'], {
    ...NO_COMPONENTS,
    securitySchemes: securityDefinitions
  })
})
