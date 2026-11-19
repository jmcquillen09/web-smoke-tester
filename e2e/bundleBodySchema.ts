import { z } from 'zod'
import { JSON_SCHEMA_2020_12, SCHEMA_REFERENCE } from './constants.ts'
import type { JsonObject } from './JsonObject.ts'

type Json = z.infer<ReturnType<typeof z.json>>
/** The document's schemas by name; a schema is an object, or `true` or `false`. */
type DocumentSchemas = Readonly<Record<string, JsonObject | boolean>>

const OPENAPI_3_1 = '3.1'
// How OpenAPI 3.0 writes an exclusive bound: a flag beside the bound, where JSON Schema writes a number.
const EXCLUSIVE_BOUNDS = [
  { bound: 'minimum', flag: 'exclusiveMinimum' },
  { bound: 'maximum', flag: 'exclusiveMaximum' }
]

const isJsonObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const schemaNameOf = (reference: Json): string => {
  const isSchemaReference = typeof reference === 'string' && reference.startsWith(SCHEMA_REFERENCE)
  return isSchemaReference ? reference.slice(SCHEMA_REFERENCE.length) : ''
}

// The names of the document's schemas that `value` points at with a `$ref`, anywhere inside it.
const referencedSchemaNames = (value: Json): string[] => {
  if (Array.isArray(value)) return value.flatMap(referencedSchemaNames)
  if (!isJsonObject(value)) return []
  return Object.entries(value).flatMap(([key, held]) => {
    const name = key === '$ref' ? schemaNameOf(held) : ''
    const isSchemaReference = name !== ''
    return isSchemaReference ? [name] : referencedSchemaNames(held)
  })
}

// Whether a property is one only a request carries, read through a `$ref` to the document's schemas.
const isWriteOnly = (property: Json, documentSchemas: DocumentSchemas): boolean => {
  if (!isJsonObject(property)) return false
  const name = schemaNameOf(property['$ref'] ?? '')
  const referenced = Object.hasOwn(documentSchemas, name) ? documentSchemas[name] : property
  return isJsonObject(referenced ?? false) && (referenced as JsonObject)['writeOnly'] === true
}

// A schema as a response is held against it: a `writeOnly` property is not required of an answer,
// and an OpenAPI 3.0 exclusive bound is written as JSON Schema writes one.
const forResponse = (value: Json, documentSchemas: DocumentSchemas, isOpenApi30: boolean): Json => {
  if (Array.isArray(value)) {
    return value.map((item) => forResponse(item, documentSchemas, isOpenApi30))
  }
  if (!isJsonObject(value)) return value
  const schema: Record<string, Json> = Object.fromEntries(
    Object.entries(value).map(([key, held]) => [
      key,
      forResponse(held, documentSchemas, isOpenApi30)
    ])
  )
  const { required, properties } = schema
  const hasRequiredProperties = Array.isArray(required) && isJsonObject(properties ?? false)
  if (hasRequiredProperties) {
    const declared = properties as JsonObject
    schema['required'] = required.filter(
      (name) => !(typeof name === 'string' && isWriteOnly(declared[name] ?? false, documentSchemas))
    )
  }
  for (const { bound, flag } of isOpenApi30 ? EXCLUSIVE_BOUNDS : []) {
    const isFlag = typeof schema[flag] === 'boolean'
    if (!isFlag) continue
    const isExclusive = schema[flag] === true && typeof schema[bound] === 'number'
    if (isExclusive) schema[flag] = schema[bound] ?? false
    else Reflect.deleteProperty(schema, flag)
    if (isExclusive) Reflect.deleteProperty(schema, bound)
  }
  return schema
}

// A response's schema made to stand alone: it carries every schema of the document it points at,
// directly or through another. OpenAPI 3.1 is marked as the JSON Schema 2020-12 it is written in.
export const bundleBodySchema = (
  schema: JsonObject,
  documentSchemas: DocumentSchemas,
  openApiVersion: string
): JsonObject => {
  const isJsonSchema2020 = openApiVersion.startsWith(OPENAPI_3_1)
  const asAnswered = (value: Json): Json => forResponse(value, documentSchemas, !isJsonSchema2020)
  const bundled: Record<string, Json> = {}
  const pending = referencedSchemaNames(schema)
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    const referenced = Object.hasOwn(documentSchemas, name) ? documentSchemas[name] : undefined
    const isNewSchema = referenced !== undefined && !Object.hasOwn(bundled, name)
    if (!isNewSchema) continue
    bundled[name] = asAnswered(referenced)
    pending.push(...referencedSchemaNames(referenced))
  }
  return {
    ...(isJsonSchema2020 ? { $schema: JSON_SCHEMA_2020_12 } : {}),
    allOf: [asAnswered(schema)],
    components: { schemas: bundled }
  }
}
