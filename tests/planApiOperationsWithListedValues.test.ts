import assert from 'node:assert/strict'
import test from 'node:test'

import type { OpenApiDocument } from '../e2e/OpenApiDocument.ts'
import { planApiOperationsWithListedValues } from '../e2e/planApiOperationsWithListedValues.ts'

const DOCUMENT_URL = 'https://api.example/openapi.json'
const OK = { '200': {} }

const documentWith = (paths: OpenApiDocument['paths']): OpenApiDocument => ({
  openapi: '3.0.3',
  paths
})

const pathParameter = (name: string) => ({ name, in: 'path', required: true })

// An API as a map from address to the JSON it lists; an address it lacks answers with no JSON.
// Records each address asked.
const apiOf = (lists: Readonly<Record<string, unknown>>) => {
  const asked: string[] = []
  const fetchApiList = async (url: string): Promise<string | undefined> => {
    asked.push(url)
    return Object.hasOwn(lists, url) ? JSON.stringify(lists[url]) : undefined
  }
  return { asked, fetchApiList }
}

void test('a path parameter without an example takes the first value its list operation lists', async () => {
  const document = documentWith({
    '/pets': { get: { responses: OK } },
    '/pets/{petId}': { get: { parameters: [pathParameter('petId')], responses: OK } }
  })
  const api = apiOf({ 'https://api.example/pets': [{ id: 7 }, { id: 8 }] })

  const { plan, filled } = await planApiOperationsWithListedValues(
    document,
    DOCUMENT_URL,
    api.fetchApiList
  )

  assert.deepEqual(
    plan.operations.map((operation) => operation.url),
    ['https://api.example/pets', 'https://api.example/pets/7']
  )
  assert.deepEqual(plan.skipped, [])
  assert.deepEqual(filled, [
    { path: '/pets/{petId}', parameter: 'petId', value: '7', listPath: '/pets' }
  ])
})

void test('nested parameters are filled outermost first, each list read once', async () => {
  const document = documentWith({
    '/pets': { get: { responses: OK } },
    '/pets/{petId}': { get: { parameters: [pathParameter('petId')], responses: OK } },
    '/pets/{petId}/visits': { get: { parameters: [pathParameter('petId')], responses: OK } },
    '/pets/{petId}/visits/{visitId}': {
      get: { parameters: [pathParameter('petId'), pathParameter('visitId')], responses: OK }
    }
  })
  const api = apiOf({
    'https://api.example/pets': [{ id: 7 }],
    'https://api.example/pets/7/visits': { visits: [{ visitId: 'v-3' }] }
  })

  const { plan } = await planApiOperationsWithListedValues(document, DOCUMENT_URL, api.fetchApiList)

  assert.deepEqual(
    plan.operations.map((operation) => operation.url),
    [
      'https://api.example/pets',
      'https://api.example/pets/7',
      'https://api.example/pets/7/visits',
      'https://api.example/pets/7/visits/v-3'
    ]
  )
  assert.deepEqual(api.asked, ['https://api.example/pets', 'https://api.example/pets/7/visits'])
})

void test('the document’s own example is used, and its list is not read', async () => {
  const document = documentWith({
    '/pets': { get: { responses: OK } },
    '/pets/{petId}': {
      get: { parameters: [{ ...pathParameter('petId'), example: 'rex' }], responses: OK }
    }
  })
  const api = apiOf({ 'https://api.example/pets': [{ id: 7 }] })

  const { plan, filled } = await planApiOperationsWithListedValues(
    document,
    DOCUMENT_URL,
    api.fetchApiList
  )

  assert.equal(plan.operations[1]?.url, 'https://api.example/pets/rex')
  assert.deepEqual(filled, [])
  assert.deepEqual(api.asked, [])
})

void test('a list that offers no value leaves the operation skipped, saying which list', async () => {
  const document = documentWith({
    '/pets': { get: { responses: OK } },
    '/pets/{petId}': { get: { parameters: [pathParameter('petId')], responses: OK } },
    '/owners': { get: { responses: OK } },
    '/owners/{ownerId}': { get: { parameters: [pathParameter('ownerId')], responses: OK } }
  })
  const api = apiOf({ 'https://api.example/pets': [] })

  const { plan } = await planApiOperationsWithListedValues(document, DOCUMENT_URL, api.fetchApiList)

  assert.deepEqual(plan.skipped, [
    {
      path: '/pets/{petId}',
      reason:
        'the document gives no example value for its path parameter "petId", and GET /pets lists none'
    },
    {
      path: '/owners/{ownerId}',
      reason:
        'the document gives no example value for its path parameter "ownerId", and GET /owners lists none'
    }
  ])
})

void test('a parameter with no list operation one level up stays skipped, and nothing is read', async () => {
  const document = documentWith({
    '/pets/{petId}': { get: { parameters: [pathParameter('petId')], responses: OK } },
    '/{tenant}': { get: { parameters: [pathParameter('tenant')], responses: OK } },
    '/files': { get: { responses: OK } },
    '/files/{name}.json': { get: { parameters: [pathParameter('name')], responses: OK } }
  })
  const api = apiOf({ 'https://api.example/files': ['report'] })

  const { plan } = await planApiOperationsWithListedValues(document, DOCUMENT_URL, api.fetchApiList)

  assert.deepEqual(
    plan.skipped.map((entry) => entry.reason),
    [
      'the document gives no example value for its path parameter "petId"',
      'the document gives no example value for its path parameter "tenant"',
      'the document gives no example value for its path parameter "name"'
    ]
  )
  assert.deepEqual(api.asked, [])
})

void test('a listed value that makes the address unsafe is never requested', async () => {
  const document = documentWith({
    '/sessions': { get: { responses: OK } },
    '/sessions/{action}': { get: { parameters: [pathParameter('action')], responses: OK } }
  })
  const api = apiOf({ 'https://api.example/sessions': ['logout'] })

  const { plan } = await planApiOperationsWithListedValues(document, DOCUMENT_URL, api.fetchApiList)

  assert.deepEqual(
    plan.operations.map((operation) => operation.url),
    ['https://api.example/sessions']
  )
  assert.deepEqual(plan.skipped, [
    {
      path: '/sessions/{action}',
      reason: 'its address suggests it ends a session or changes data'
    }
  ])
})
