import { findListedPathValue } from './findListedPathValue.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'
import { type ApiOperationPlan, planApiOperations } from './planApiOperations.ts'

/** A list operation's JSON answer, or undefined when it does not answer with JSON. */
export type FetchApiList = (url: string) => Promise<string | undefined>

export interface ApiOperationPlanWithListedValues {
  readonly plan: ApiOperationPlan
  /** Each path parameter a list operation's answer gave a value for. */
  readonly filled: readonly {
    readonly path: string
    readonly parameter: string
    readonly value: string
    readonly listPath: string
  }[]
}

// The list operation one level up from a path parameter: `/books/{bookId}/reviews` for `reviewId` in
// `/books/{bookId}/reviews/{reviewId}`. Empty when the parameter is not a whole segment after one.
const listPathOf = (path: string, parameter: string): string => {
  const segments = path.split('/')
  const parameterIndex = segments.indexOf(`{${parameter}}`)
  const hasListSegment = parameterIndex > 1
  return hasListSegment ? segments.slice(0, parameterIndex).join('/') : ''
}

// The plan of a document whose path parameters without an example take a value from the answer of
// the list operation one level up, when the run requests that operation anyway. Lists are read
// outermost first, so `/a/{x}/b/{y}` is filled once `/a` has given `x`.
export const planApiOperationsWithListedValues = async (
  document: OpenApiDocument,
  documentUrl: string,
  fetchApiList: FetchApiList
): Promise<ApiOperationPlanWithListedValues> => {
  const values = new Map<string, Map<string, string>>()
  const filled: ApiOperationPlanWithListedValues['filled'][number][] = []
  const emptyListPaths = new Map<string, string>()
  const asked = new Set<string>()
  const lists = new Map<string, Promise<string | undefined>>()
  const readList = (url: string): Promise<string | undefined> => {
    const list = lists.get(url) ?? fetchApiList(url)
    lists.set(url, list)
    return list
  }

  for (;;) {
    const plan = planApiOperations(document, documentUrl, undefined, values)
    const waiting = plan.awaitingPathValues.filter(
      ({ path, parameter }) => !asked.has(`${path} ${parameter}`)
    )
    const hasWaiting = waiting.length > 0
    if (!hasWaiting) {
      const skipped = plan.skipped.map((entry) => {
        const listPath = emptyListPaths.get(entry.path) ?? ''
        const hasEmptyList = listPath !== ''
        return hasEmptyList
          ? { ...entry, reason: `${entry.reason}, and GET ${listPath} lists none` }
          : entry
      })
      return { plan: { ...plan, skipped }, filled }
    }
    for (const { path, parameter } of waiting) {
      asked.add(`${path} ${parameter}`)
      const listPath = listPathOf(path, parameter)
      const list = plan.operations.find((operation) => operation.path === listPath)
      const hasList = list !== undefined
      if (!hasList) continue
      const body = (await readList(list.url)) ?? ''
      const value = findListedPathValue(body, parameter) ?? ''
      const hasValue = value !== ''
      if (!hasValue) {
        emptyListPaths.set(path, listPath)
        continue
      }
      values.set(path, new Map(values.get(path)).set(parameter, value))
      filled.push({ path, parameter, value, listPath })
    }
  }
}
