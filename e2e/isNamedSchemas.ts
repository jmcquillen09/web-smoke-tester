import { isJsonObject } from './isJsonObject.ts'
import type { Json } from './Json.ts'
import type { JsonObject } from './JsonObject.ts'

// The keywords under which a schema holds schemas by name. A name there is a property's or a
// definition's own, never a keyword, whatever it spells.
const NAMED_SCHEMAS_KEYWORDS: readonly string[] = [
  'properties',
  'patternProperties',
  'definitions',
  '$defs',
  'dependentSchemas'
]

// Whether `held`, under `keyword`, is schemas by name rather than one schema.
export const isNamedSchemas = (keyword: string, held: Json): held is JsonObject =>
  NAMED_SCHEMAS_KEYWORDS.includes(keyword) && isJsonObject(held)
