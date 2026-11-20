import { isJsonArray } from './isJsonArray.ts'
import { isJsonObject } from './isJsonObject.ts'
import type { Json } from './Json.ts'
import { schemaEntriesOf } from './schemaEntriesOf.ts'

// `value` with `adapt` applied to every schema in it, the innermost first. `adapt` is handed a copy
// it may change; the data a schema holds (an `enum`, an `example`) is left as written.
export const mapJsonSchemas = (
  value: Json,
  adapt: (schema: Record<string, Json>) => Json
): Json => {
  if (isJsonArray(value)) return value.map((item) => mapJsonSchemas(item, adapt))
  if (!isJsonObject(value)) return value
  return adapt({
    ...value,
    ...Object.fromEntries(
      schemaEntriesOf(value).map(([keyword, held]) => [keyword, mapJsonSchemas(held, adapt)])
    )
  })
}
