import { z } from 'zod'

// Any JSON object: what a JSON Schema is before a validator reads it.
export const JsonObjectSchema = z.record(z.string(), z.json())

export type JsonObject = z.infer<typeof JsonObjectSchema>
