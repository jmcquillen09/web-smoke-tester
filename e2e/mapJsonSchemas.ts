import { isJsonArray } from './isJsonArray.ts'
import { isJsonObject } from './isJsonObject.ts'
import { isNamedSchemas } from './isNamedSchemas.ts'
import type { Json } from './Json.ts'
import { schemaEntriesOf } from './schemaEntriesOf.ts'

type AdaptSchema = (schema: Record<string, Json>) => Json

// What a schema holds under one keyword, adapted: each schema held by name keeps its name.
const mapHeldSchemas = (keyword: string, held: Json, adapt: AdaptSchema): Json =>
  isNamedSchemas(keyword, held)
    ? Object.fromEntries(
        Object.entries(held).map(([name, schema]) => [name, mapJsonSchemas(schema, adapt)])
      )
    : mapJsonSchemas(held, adapt)

// `value` with `adapt` applied to every schema in it, the innermost first. `adapt` is handed a copy
// it may change; the data a schema holds (an `enum`, an `example`) is left as written.
export const mapJsonSchemas = (value: Json, adapt: AdaptSchema): Json => {
  if (isJsonArray(value)) return value.map((item) => mapJsonSchemas(item, adapt))
  if (!isJsonObject(value)) return value
  return adapt({
    ...value,
    ...Object.fromEntries(
      schemaEntriesOf(value).map(([keyword, held]) => [
        keyword,
        mapHeldSchemas(keyword, held, adapt)
      ])
    )
  })
}
