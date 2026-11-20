import { isJsonArray } from './isJsonArray.ts'
import type { Json } from './Json.ts'
import type { JsonObject } from './JsonObject.ts'

export const isJsonObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !isJsonArray(value)
