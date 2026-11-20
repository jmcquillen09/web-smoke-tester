import type { Json } from './Json.ts'
import type { JsonObject } from './JsonObject.ts'

// The keywords whose value is data, not a schema: what is under them is never read as one.
const LITERAL_KEYWORDS: readonly string[] = ['enum', 'const', 'default', 'example', 'examples']

// The schemas `schema` holds under its keywords, each with the keyword; data is left out.
export const schemaEntriesOf = (schema: JsonObject): [string, Json][] =>
  Object.entries(schema).filter(([keyword]) => !LITERAL_KEYWORDS.includes(keyword))
