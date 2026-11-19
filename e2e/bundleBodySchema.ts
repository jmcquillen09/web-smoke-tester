import { z } from 'zod'
import { JSON_SCHEMA_2020_12, SCHEMA_REFERENCE } from './constants.ts'
import type { JsonObject } from './JsonObject.ts'

type Json = z.infer<ReturnType<typeof z.json>>

const OPENAPI_3_1 = '3.1'

const isJsonObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// The names of the document's schemas that `value` points at with a `$ref`, anywhere inside it.
const referencedSchemaNames = (value: Json): string[] => {
  if (Array.isArray(value)) return value.flatMap(referencedSchemaNames)
  if (!isJsonObject(value)) return []
  return Object.entries(value).flatMap(([key, held]) => {
    const isSchemaReference =
      key === '$ref' && typeof held === 'string' && held.startsWith(SCHEMA_REFERENCE)
    return isSchemaReference ? [held.slice(SCHEMA_REFERENCE.length)] : referencedSchemaNames(held)
  })
}

// A response's schema made to stand alone: it carries every schema of the document it points at,
// directly or through another, where its `$ref`s still find them. An OpenAPI 3.1 schema is marked
// as JSON Schema 2020-12, which is what that version writes.
export const bundleBodySchema = (
  schema: JsonObject,
  documentSchemas: Readonly<Record<string, JsonObject>>,
  openApiVersion: string
): JsonObject => {
  const bundled: Record<string, JsonObject> = {}
  const pending = referencedSchemaNames(schema)
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    const referenced = Object.hasOwn(documentSchemas, name) ? documentSchemas[name] : undefined
    const isNewSchema = referenced !== undefined && !Object.hasOwn(bundled, name)
    if (!isNewSchema) continue
    bundled[name] = referenced
    pending.push(...referencedSchemaNames(referenced))
  }
  const isJsonSchema2020 = openApiVersion.startsWith(OPENAPI_3_1)
  return {
    ...(isJsonSchema2020 ? { $schema: JSON_SCHEMA_2020_12 } : {}),
    allOf: [schema],
    components: { schemas: bundled }
  }
}
