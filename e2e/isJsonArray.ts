import type { Json } from './Json.ts'

export const isJsonArray = (value: Json): value is Json[] => Array.isArray(value)
