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

// An address without its query, which a list operation may carry and the level above it does not.
const withoutQuery = (url: string): string => {
  const address = new URL(url)
  address.search = ''
  return address.href
}

// The plan of a document whose path parameters without an example take a value from the answer of
// the operation the run requests at the address one level up. Lists are read outermost first.
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
    for (const { path, parameter, listUrl } of waiting) {
      asked.add(`${path} ${parameter}`)
      const list = plan.operations.find((operation) => withoutQuery(operation.url) === listUrl)
      const hasList = list !== undefined
      if (!hasList) continue
      const body = (await readList(list.url)) ?? ''
      const value = findListedPathValue(body, parameter) ?? ''
      const hasValue = value !== ''
      if (!hasValue) {
        emptyListPaths.set(path, list.path)
        continue
      }
      values.set(path, new Map(values.get(path)).set(parameter, value))
      filled.push({ path, parameter, value, listPath: list.path })
    }
  }
}
