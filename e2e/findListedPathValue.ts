import { z } from 'zod'

const ID_PROPERTY = 'id'

const ListedItemSchema = z.union([z.string(), z.number(), z.record(z.string(), z.unknown())])
// A list operation's answer: the list itself, or an object that holds it under one of its properties.
const ListBodySchema = z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())])

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)
const isRecord = (value: z.infer<typeof ListedItemSchema>): value is Record<string, unknown> =>
  typeof value === 'object'

// A value fit for a path: text that is not empty, or a number.
const pathValueOf = (value: unknown): string | undefined => {
  const isPathValue = (typeof value === 'string' && value !== '') || typeof value === 'number'
  return isPathValue ? String(value) : undefined
}

// The value a list operation's JSON answer offers for a path parameter: from its first item, the
// property named as the parameter, else its `id`; or the item itself when the list holds plain values.
export const findListedPathValue = (body: string, parameter: string): string | undefined => {
  let content: unknown
  try {
    content = JSON.parse(body)
  } catch {
    return undefined
  }
  const parsed = ListBodySchema.safeParse(content)
  if (!parsed.success) return undefined
  const list = isList(parsed.data) ? parsed.data : Object.values(parsed.data).find(isList)
  const item = ListedItemSchema.safeParse(list?.[0])
  if (!item.success) return undefined
  if (!isRecord(item.data)) return pathValueOf(item.data)
  return pathValueOf(item.data[parameter]) ?? pathValueOf(item.data[ID_PROPERTY])
}
