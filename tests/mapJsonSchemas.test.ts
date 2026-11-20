import assert from 'node:assert/strict'
import test from 'node:test'

import type { Json } from '../e2e/Json.ts'
import { mapJsonSchemas } from '../e2e/mapJsonSchemas.ts'

const titled = (schema: Record<string, Json>): Json => ({ ...schema, title: 'seen' })

void test('every schema is adapted, one held under a keyword or in a list included', () => {
  const schema = {
    type: 'object',
    properties: { name: { type: 'string' } },
    anyOf: [{ type: 'number' }]
  }

  assert.deepEqual(mapJsonSchemas(schema, titled), {
    type: 'object',
    title: 'seen',
    properties: { name: { type: 'string', title: 'seen' } },
    anyOf: [{ type: 'number', title: 'seen' }]
  })
})

void test('a schema held by name is adapted under its name, whatever keyword the name spells', () => {
  const schema = { properties: { enum: { type: 'string' }, default: { type: 'number' } } }

  assert.deepEqual(mapJsonSchemas(schema, titled), {
    title: 'seen',
    properties: {
      enum: { type: 'string', title: 'seen' },
      default: { type: 'number', title: 'seen' }
    }
  })
})

void test('the data a schema holds is left as written', () => {
  const schema = { enum: [{ id: 1 }], default: { id: 1 }, example: { id: 2 } }

  assert.deepEqual(mapJsonSchemas(schema, titled), { ...schema, title: 'seen' })
})

void test('a schema is adapted after the schemas it holds, and is itself left unchanged', () => {
  const schema = { items: { type: 'string' } }
  const seen: Json[] = []

  mapJsonSchemas(schema, (held) => {
    seen.push(held)
    return held
  })

  assert.deepEqual(seen, [{ type: 'string' }, { items: { type: 'string' } }])
  assert.deepEqual(schema, { items: { type: 'string' } })
})

void test('a value that is no schema object is returned as it is', () => {
  assert.equal(mapJsonSchemas(true, titled), true)
  assert.equal(mapJsonSchemas('string', titled), 'string')
})
