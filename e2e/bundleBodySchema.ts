import { JSON_SCHEMA_2020_12, SCHEMA_REFERENCE } from './constants.ts'
import { isJsonArray } from './isJsonArray.ts'
import { isJsonObject } from './isJsonObject.ts'
import type { Json } from './Json.ts'
import type { JsonObject } from './JsonObject.ts'
import { mapJsonSchemas } from './mapJsonSchemas.ts'
import { schemaEntriesOf } from './schemaEntriesOf.ts'

/** A JSON Schema: an object, or `true` (anything) or `false` (nothing). */
type JsonSchema = JsonObject | boolean
/** The document's schemas by name. */
type DocumentSchemas = Readonly<Record<string, JsonSchema>>

const OPENAPI_3_1 = '3.1'
// How OpenAPI 3.0 writes an exclusive bound: a flag beside the bound, where JSON Schema writes a number.
const EXCLUSIVE_BOUNDS = [
  { bound: 'minimum', flag: 'exclusiveMinimum' },
  { bound: 'maximum', flag: 'exclusiveMaximum' }
]

// The document's schema a `$ref` points into: `Pet` for `#/components/schemas/Pet/properties/id`.
// Empty for a `$ref` that points anywhere else.
const schemaNameOf = (reference: Json): string => {
  const isSchemaReference = typeof reference === 'string' && reference.startsWith(SCHEMA_REFERENCE)
  const [name = ''] = isSchemaReference ? reference.slice(SCHEMA_REFERENCE.length).split('/') : []
  return name
}

// The names of the document's schemas that `value` points at with a `$ref`, anywhere inside it.
const referencedSchemaNames = (value: Json): string[] => {
  if (isJsonArray(value)) return value.flatMap(referencedSchemaNames)
  if (!isJsonObject(value)) return []
  return schemaEntriesOf(value).flatMap(([keyword, held]) => {
    const name = keyword === '$ref' ? schemaNameOf(held) : ''
    const isSchemaReference = name !== ''
    return isSchemaReference ? [name] : referencedSchemaNames(held)
  })
}

// Whether a property is one only a request carries, read through a `$ref` to the document's schemas.
const isWriteOnly = (property: Json, documentSchemas: DocumentSchemas): boolean => {
  if (!isJsonObject(property)) return false
  const name = schemaNameOf(property['$ref'] ?? '')
  const referenced = Object.hasOwn(documentSchemas, name) ? documentSchemas[name] : property
  const declared = referenced ?? false
  return isJsonObject(declared) && declared['writeOnly'] === true
}

// A schema as a response is held against it: a `writeOnly` property is not required of an answer,
// and an OpenAPI 3.0 exclusive bound is written as JSON Schema writes one.
const forResponse = (value: Json, documentSchemas: DocumentSchemas, isOpenApi30: boolean): Json =>
  mapJsonSchemas(value, (schema) => {
    const required = schema['required'] ?? false
    const properties = schema['properties'] ?? false
    const hasRequiredProperties = isJsonArray(required) && isJsonObject(properties)
    if (hasRequiredProperties) {
      const isRequiredInResponse = (name: Json): boolean =>
        !(typeof name === 'string' && isWriteOnly(properties[name] ?? false, documentSchemas))
      schema['required'] = required.filter(isRequiredInResponse)
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
  })

// A response's schema made to stand alone: it carries every schema of the document it points at,
// directly or through another. OpenAPI 3.1 is marked as the JSON Schema 2020-12 it is written in.
export const bundleBodySchema = (
  schema: JsonSchema,
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
