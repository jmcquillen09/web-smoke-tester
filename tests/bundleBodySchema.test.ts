import assert from 'node:assert/strict'
import test from 'node:test'

import { bundleBodySchema } from '../e2e/bundleBodySchema.ts'
import type { JsonObject } from '../e2e/JsonObject.ts'

const reference = (name: string): JsonObject => ({ $ref: `#/components/schemas/${name}` })

const SCHEMAS: Record<string, JsonObject> = {
  Pet: { type: 'object', properties: { owner: reference('Owner') } },
  Owner: { type: 'object', properties: { pets: { type: 'array', items: reference('Pet') } } },
  Visit: { type: 'object' }
}

void test('a schema carries every schema it points at, directly or through another, and no other', () => {
  const schema = { type: 'array', items: reference('Pet') }

  assert.deepEqual(bundleBodySchema(schema, SCHEMAS, '3.0.3'), {
    allOf: [schema],
    components: { schemas: { Pet: SCHEMAS['Pet'], Owner: SCHEMAS['Owner'] } }
  })
})

void test('a schema that points at none carries none', () => {
  const schema = { type: 'string' }

  assert.deepEqual(bundleBodySchema(schema, SCHEMAS, '3.0.3'), {
    allOf: [schema],
    components: { schemas: {} }
  })
})

void test('a pointer to a schema the document does not hold, or to another section, is left as it is', () => {
  const schema = {
    oneOf: [reference('Gone'), { $ref: '#/components/responses/NotFound' }, reference('Visit')]
  }

  assert.deepEqual(bundleBodySchema(schema, SCHEMAS, '3.0.3'), {
    allOf: [schema],
    components: { schemas: { Visit: SCHEMAS['Visit'] } }
  })
})

void test('an OpenAPI 3.1 schema is marked as JSON Schema 2020-12', () => {
  const bundled = bundleBodySchema({ type: 'string' }, SCHEMAS, '3.1.0')

  assert.equal(bundled['$schema'], 'https://json-schema.org/draft/2020-12/schema')
})
