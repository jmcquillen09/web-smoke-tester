import assert from 'node:assert/strict'
import test from 'node:test'

import type { OpenApiDocument } from '../e2e/OpenApiDocument.ts'
import { planApiOperations } from '../e2e/planApiOperations.ts'

const DOCUMENT_URL = 'https://api.example/docs/openapi.json'

const documentWith = (
  paths: OpenApiDocument['paths'],
  rest: Partial<OpenApiDocument> = {}
): OpenApiDocument => ({ openapi: '3.0.3', paths, ...rest })

const OK_JSON = { '200': { content: { 'application/json': {} } } }

void test('a GET operation becomes one request on the document’s server', () => {
  const document = documentWith(
    { '/pets': { get: { responses: OK_JSON } } },
    { servers: [{ url: '/api/v3' }] }
  )

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL), {
    operations: [
      {
        method: 'GET',
        path: '/pets',
        url: 'https://api.example/api/v3/pets',
        secured: false,
        bodySchemas: [],
        responses: [{ status: '200', contentTypes: ['application/json'] }]
      }
    ],
    skipped: [],
    awaitingPathValues: []
  })
})

void test('a document without servers is served from its own site’s root', () => {
  const document = documentWith({ '/pets': { get: { responses: OK_JSON } } })

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.equal(operation?.url, 'https://api.example/pets')
})

void test('a path with only operations that change data plans no request', () => {
  const document = documentWith({ '/pets': {} })

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL), {
    operations: [],
    skipped: [],
    awaitingPathValues: []
  })
})

void test('required path and query parameters take the document’s example values', () => {
  const document = documentWith({
    '/pets/{petId}': {
      parameters: [{ name: 'petId', in: 'path', required: true, schema: { default: 7 } }],
      get: {
        parameters: [
          { name: 'status', in: 'query', required: true, schema: { enum: ['on sale', 'sold'] } },
          { name: 'limit', in: 'query', example: 5 }
        ],
        responses: OK_JSON
      }
    }
  })

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.equal(operation?.url, 'https://api.example/pets/7?status=on+sale')
})

void test('an operation’s own parameter replaces the path’s parameter of the same name', () => {
  const document = documentWith({
    '/pets/{petId}': {
      parameters: [{ name: 'petId', in: 'path', required: true, example: 1 }],
      get: {
        parameters: [{ name: 'petId', in: 'path', required: true, example: 2 }],
        responses: OK_JSON
      }
    }
  })

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.equal(operation?.url, 'https://api.example/pets/2')
})

void test('parameters and responses given by $ref come from the document’s components', () => {
  const document = documentWith(
    {
      '/pets/{petId}': {
        get: {
          parameters: [{ $ref: '#/components/parameters/PetId' }],
          responses: { '404': { $ref: '#/components/responses/NotFound' } }
        }
      }
    },
    {
      components: {
        parameters: { PetId: { name: 'petId', in: 'path', required: true, example: 'rex' } },
        responses: { NotFound: { content: { 'application/problem+json': {} } } }
      }
    }
  )

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.equal(operation?.url, 'https://api.example/pets/rex')
  assert.deepEqual(operation?.responses, [
    { status: '404', contentTypes: ['application/problem+json'] }
  ])
})

void test('a $ref to a component that is itself a $ref skips the operation', () => {
  const document = documentWith(
    { '/pets': { get: { responses: { '200': { $ref: '#/components/responses/Alias' } } } } },
    {
      components: {
        responses: {
          Alias: { $ref: '#/components/responses/Pets' },
          Pets: { content: { 'application/json': {} } }
        }
      }
    }
  )

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL), {
    operations: [],
    skipped: [
      {
        path: '/pets',
        reason: "it has a response $ref that names no definition in the document's components"
      }
    ],
    awaitingPathValues: []
  })
})

void test('an operation is secured by its own requirement or the document’s', () => {
  const document = documentWith(
    {
      '/open': { get: { security: [], responses: OK_JSON } },
      '/inherits': { get: { responses: OK_JSON } },
      '/optional': { get: { security: [{}], responses: OK_JSON } }
    },
    { security: [{ apiKey: [] }] }
  )

  const secured = planApiOperations(document, DOCUMENT_URL).operations.map(
    (operation) => [operation.path, operation.secured] as const
  )

  assert.deepEqual(secured, [
    ['/open', false],
    ['/inherits', true],
    ['/optional', false]
  ])
})

void test('an operation a run cannot request safely is skipped with the reason', () => {
  const document = documentWith({
    '/user/logout': { get: { responses: OK_JSON } },
    '/pets/{petId}': {
      get: { parameters: [{ name: 'petId', in: 'path', required: true }], responses: OK_JSON }
    },
    '/orders/{orderId}': { get: { responses: OK_JSON } },
    '/me': {
      get: { parameters: [{ name: 'X-Token', in: 'header', required: true }], responses: OK_JSON }
    },
    '/refs': { get: { parameters: [{ $ref: '#/elsewhere/Thing' }], responses: OK_JSON } }
  })

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL), {
    operations: [],
    skipped: [
      { path: '/user/logout', reason: 'its path suggests it ends a session or changes data' },
      {
        path: '/pets/{petId}',
        reason: 'the document gives no example value for its path parameter "petId"'
      },
      {
        path: '/orders/{orderId}',
        reason: 'its path has a placeholder the document declares no parameter for'
      },
      { path: '/me', reason: 'it requires the header parameter "X-Token"' },
      {
        path: '/refs',
        reason: "it has a parameter $ref that names no definition in the document's components"
      }
    ],
    awaitingPathValues: [
      { path: '/pets/{petId}', parameter: 'petId', listUrl: 'https://api.example/pets' }
    ]
  })
})

void test('a server on another site, or with variables, skips every operation', () => {
  const skippedWith = (url: string) =>
    planApiOperations(
      documentWith({ '/pets': { get: { responses: OK_JSON } } }, { servers: [{ url }] }),
      DOCUMENT_URL
    )

  assert.deepEqual(skippedWith('https://other.example/v1'), {
    operations: [],
    skipped: [
      {
        path: '/pets',
        reason: "the document's server https://other.example is another site than the document's"
      }
    ],
    awaitingPathValues: []
  })
  assert.deepEqual(skippedWith('https://{region}.api.example'), {
    operations: [],
    skipped: [
      {
        path: '/pets',
        reason: "the document's server address https://{region}.api.example has variables"
      }
    ],
    awaitingPathValues: []
  })
})

void test('operations past the run’s limit are skipped, in the document’s order', () => {
  const document = documentWith({
    '/a': { get: { responses: OK_JSON } },
    '/b': { get: { responses: OK_JSON } },
    '/c': { get: { responses: OK_JSON } }
  })

  const plan = planApiOperations(document, DOCUMENT_URL, 2)

  assert.deepEqual(
    plan.operations.map((operation) => operation.path),
    ['/a', '/b']
  )
  assert.deepEqual(plan.skipped, [{ path: '/c', reason: 'a run tests at most 2 operations' }])
})

void test('a path’s or an operation’s own servers replace the document’s', () => {
  const document = documentWith(
    {
      '/pets': { get: { responses: OK_JSON } },
      '/orders': { servers: [{ url: '/v2' }], get: { responses: OK_JSON } },
      '/users': {
        servers: [{ url: '/v2' }],
        get: { servers: [{ url: '/v3' }], responses: OK_JSON }
      },
      '/elsewhere': { get: { servers: [{ url: 'https://other.example' }], responses: OK_JSON } }
    },
    { servers: [{ url: '/v1' }] }
  )

  const plan = planApiOperations(document, DOCUMENT_URL)

  assert.deepEqual(
    plan.operations.map((operation) => operation.url),
    ['https://api.example/v1/pets', 'https://api.example/v2/orders', 'https://api.example/v3/users']
  )
  assert.deepEqual(plan.skipped, [
    {
      path: '/elsewhere',
      reason: "the document's server https://other.example is another site than the document's"
    }
  ])
})

void test('an operation that accepts a request without credentials is not secured', () => {
  const document = documentWith({
    '/either': { get: { security: [{}, { apiKey: [] }], responses: OK_JSON } },
    '/both': { get: { security: [{ apiKey: [] }, { oauth: ['read'] }], responses: OK_JSON } }
  })

  const secured = planApiOperations(document, DOCUMENT_URL).operations.map(
    (operation) => [operation.path, operation.secured] as const
  )

  assert.deepEqual(secured, [
    ['/either', false],
    ['/both', true]
  ])
})

void test('a path that names another site is never requested', () => {
  const document = documentWith({
    '//other.example/data': { get: { responses: OK_JSON } },
    '/\\other.example/data': { get: { responses: OK_JSON } },
    pets: { get: { responses: OK_JSON } }
  })

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL), {
    operations: [],
    skipped: [
      { path: '//other.example/data', reason: 'its path does not start with one "/"' },
      { path: '/\\other.example/data', reason: 'its path does not start with one "/"' },
      { path: 'pets', reason: 'its path does not start with one "/"' }
    ],
    awaitingPathValues: []
  })
})

void test('a path parameter cannot move a request to another site', () => {
  const document = documentWith({
    '/{host}/data': {
      get: {
        parameters: [{ name: 'host', in: 'path', required: true, example: '/other.example' }],
        responses: OK_JSON
      }
    }
  })

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.equal(operation?.url, 'https://api.example/%2Fother.example/data')
})

void test('an address that example values or the server make unsafe is never requested', () => {
  const document = documentWith({
    '/session/{action}': {
      get: {
        parameters: [{ name: 'action', in: 'path', required: true, example: 'logout' }],
        responses: OK_JSON
      }
    },
    '/items': {
      get: {
        parameters: [{ name: 'action', in: 'query', required: true, example: 'delete' }],
        responses: OK_JSON
      }
    },
    '/accounts': { servers: [{ url: '/unsubscribe' }], get: { responses: OK_JSON } }
  })

  const reason = 'its address suggests it ends a session or changes data'

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL), {
    operations: [],
    skipped: [
      { path: '/session/{action}', reason },
      { path: '/items', reason },
      { path: '/accounts', reason }
    ],
    awaitingPathValues: []
  })
})

void test('an operation that requires a query API key is skipped, example value or not', () => {
  const document = documentWith(
    {
      '/reports': {
        get: {
          parameters: [{ name: 'api_key', in: 'query', required: true, example: 'secret-key' }],
          responses: OK_JSON
        }
      },
      '/pets': {
        get: {
          parameters: [{ name: 'api_key', in: 'query', example: 'secret-key' }],
          responses: OK_JSON
        }
      }
    },
    {
      components: {
        securitySchemes: {
          key: { type: 'apiKey', in: 'query', name: 'api_key' },
          session: { type: 'http' }
        }
      }
    }
  )

  const plan = planApiOperations(document, DOCUMENT_URL)

  assert.deepEqual(
    plan.operations.map((operation) => operation.url),
    ['https://api.example/pets']
  )
  assert.deepEqual(plan.skipped, [
    { path: '/reports', reason: 'it requires the credential query parameter "api_key"' }
  ])
})

void test('an operation awaiting a path value names the address one level up, on its own server', () => {
  const document = documentWith(
    {
      '/pets/{petId}/visits/{visitId}': {
        get: {
          parameters: [
            { name: 'visitId', in: 'path', required: true },
            { name: 'petId', in: 'path', required: true, example: 2 }
          ],
          responses: OK_JSON
        }
      },
      '/{tenant}': {
        get: { parameters: [{ name: 'tenant', in: 'path', required: true }], responses: OK_JSON }
      },
      '/files/{name}.json': {
        get: { parameters: [{ name: 'name', in: 'path', required: true }], responses: OK_JSON }
      }
    },
    { servers: [{ url: '/api/v3' }] }
  )

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL).awaitingPathValues, [
    {
      path: '/pets/{petId}/visits/{visitId}',
      parameter: 'visitId',
      listUrl: 'https://api.example/api/v3/pets/2/visits'
    },
    { path: '/{tenant}', parameter: 'tenant', listUrl: '' },
    { path: '/files/{name}.json', parameter: 'name', listUrl: '' }
  ])
})

void test('the outermost path parameter without a value is the one awaited, whatever order they are declared in', () => {
  const document = documentWith({
    '/pets/{petId}/visits/{visitId}': {
      get: {
        parameters: [
          { name: 'visitId', in: 'path', required: true },
          { name: 'petId', in: 'path', required: true }
        ],
        responses: OK_JSON
      }
    }
  })

  assert.deepEqual(planApiOperations(document, DOCUMENT_URL).awaitingPathValues, [
    {
      path: '/pets/{petId}/visits/{visitId}',
      parameter: 'petId',
      listUrl: 'https://api.example/pets'
    }
  ])
})

void test('a response’s schema is handed on, standing alone, for each content type that declares one', () => {
  const pet = { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } }
  const document = documentWith(
    {
      '/pets': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } }
                },
                'text/csv': {}
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        }
      }
    },
    {
      components: {
        schemas: { Pet: pet, Unused: { type: 'string' } },
        responses: {
          NotFound: { content: { 'application/problem+json': { schema: { type: 'object' } } } }
        }
      }
    }
  )

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.deepEqual(operation?.bodySchemas, [
    {
      status: '200',
      contentType: 'application/json',
      schema: {
        allOf: [{ type: 'array', items: { $ref: '#/components/schemas/Pet' } }],
        components: { schemas: { Pet: pet } }
      }
    },
    {
      status: '404',
      contentType: 'application/problem+json',
      schema: { allOf: [{ type: 'object' }], components: { schemas: {} } }
    }
  ])
})

void test('a schema entry that is no schema does not cost a response the document’s other schemas', () => {
  const document = documentWith(
    {
      '/pets': {
        get: {
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
            }
          }
        }
      }
    },
    {
      components: {
        schemas: {
          Pet: { type: 'object', properties: { tag: { $ref: '#/components/schemas/Any' } } },
          Any: true,
          Broken: 'not a schema'
        }
      }
    }
  )

  const [operation] = planApiOperations(document, DOCUMENT_URL).operations

  assert.deepEqual(operation?.bodySchemas[0]?.schema['components'], {
    schemas: {
      Pet: { type: 'object', properties: { tag: { $ref: '#/components/schemas/Any' } } },
      Any: true
    }
  })
})
