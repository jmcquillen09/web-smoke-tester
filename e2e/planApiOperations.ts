import type { ApiOperation } from './ApiOperation.ts'
import { API_OPERATION_LIMIT, UNSAFE_LINK } from './constants.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'

export interface ApiOperationPlan {
  readonly operations: readonly ApiOperation[]
  /** The GET operations the run leaves out, each with why. */
  readonly skipped: readonly { readonly path: string; readonly reason: string }[]
}

type Planned<T> =
  | { readonly kind: 'planned'; readonly value: T }
  | { readonly kind: 'skipped'; readonly reason: string }

type OpenApiPathItem = OpenApiDocument['paths'][string]
type OpenApiOperation = NonNullable<OpenApiPathItem['get']>
type OpenApiComponents = NonNullable<OpenApiDocument['components']>
type OpenApiParameter = NonNullable<OpenApiComponents['parameters']>[string]
type OpenApiResponse = NonNullable<OpenApiComponents['responses']>[string]

const PARAMETER_REFERENCE = '#/components/parameters/'
const RESPONSE_REFERENCE = '#/components/responses/'

const planned = <T>(value: T): Planned<T> => ({ kind: 'planned', value })
const skipped = (reason: string): { readonly kind: 'skipped'; readonly reason: string } => ({
  kind: 'skipped',
  reason
})

// The component a `$ref` names, or undefined when it points anywhere but that components section.
const resolveComponent = <T>(
  reference: string,
  prefix: string,
  components: Readonly<Record<string, T>> = {}
): T | undefined => {
  const name = reference.startsWith(prefix) ? reference.slice(prefix.length) : ''
  return Object.hasOwn(components, name) ? components[name] : undefined
}

const planServer = (document: OpenApiDocument, documentUrl: string): Planned<URL> => {
  const address = document.servers?.[0]?.url ?? '/'
  const hasVariables = address.includes('{')
  if (hasVariables) return skipped(`the document's server address ${address} has variables`)
  const isUrl = URL.canParse(address, documentUrl)
  if (!isUrl) return skipped(`the document's server address ${address} is not a URL`)
  const server = new URL(address, documentUrl)
  const isDocumentSite = server.origin === new URL(documentUrl).origin
  if (!isDocumentSite) {
    return skipped(`the document's server ${server.origin} is another site than the document's`)
  }
  return planned(server)
}

// The path item's parameters then the operation's own, which replace a path-level one of the same name.
const planParameters = (
  document: OpenApiDocument,
  item: OpenApiPathItem,
  operation: OpenApiOperation
): Planned<readonly OpenApiParameter[]> => {
  const parameters = new Map<string, OpenApiParameter>()
  for (const entry of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) {
    const parameter =
      '$ref' in entry
        ? resolveComponent(entry.$ref, PARAMETER_REFERENCE, document.components?.parameters)
        : entry
    const isResolved = parameter !== undefined
    if (!isResolved) return skipped("it has a parameter $ref outside the document's components")
    parameters.set(`${parameter.in}:${parameter.name}`, parameter)
  }
  return planned([...parameters.values()])
}

const exampleOf = (parameter: OpenApiParameter): string | number | boolean | undefined =>
  parameter.example ??
  parameter.schema?.example ??
  parameter.schema?.default ??
  parameter.schema?.enum?.[0]

// The address to request: required path and query parameters take the document's own example
// values, and optional parameters are left out.
const planUrl = (
  path: string,
  parameters: readonly OpenApiParameter[],
  server: URL
): Planned<string> => {
  let filledPath = path
  const query = new URLSearchParams()
  for (const parameter of parameters) {
    const isPathParameter = parameter.in === 'path'
    const isRequired = isPathParameter || parameter.required === true
    if (!isRequired) continue
    const isSendable = isPathParameter || parameter.in === 'query'
    if (!isSendable) {
      return skipped(`it requires the ${parameter.in} parameter "${parameter.name}"`)
    }
    const value = exampleOf(parameter)
    const hasValue = value !== undefined
    if (!hasValue) {
      return skipped(
        `the document gives no example value for its ${parameter.in} parameter "${parameter.name}"`
      )
    }
    if (isPathParameter) {
      filledPath = filledPath.replaceAll(`{${parameter.name}}`, encodeURIComponent(String(value)))
    } else {
      query.set(parameter.name, String(value))
    }
  }
  const isFilled = !filledPath.includes('{')
  if (!isFilled) return skipped('its path has a placeholder the document declares no parameter for')
  const url = new URL(`${server.pathname.replace(/\/$/, '')}${filledPath}`, server.origin)
  url.search = query.toString()
  return planned(url.href)
}

const planResponses = (
  document: OpenApiDocument,
  operation: OpenApiOperation
): Planned<ApiOperation['responses']> => {
  const responses: ApiOperation['responses'] = []
  for (const [status, entry] of Object.entries(operation.responses ?? {})) {
    const response: OpenApiResponse | undefined =
      '$ref' in entry
        ? resolveComponent(entry.$ref, RESPONSE_REFERENCE, document.components?.responses)
        : entry
    const isResolved = response !== undefined
    if (!isResolved) return skipped("it has a response $ref outside the document's components")
    responses.push({ status, contentTypes: Object.keys(response.content ?? {}) })
  }
  return planned(responses)
}

const planOperation = (
  document: OpenApiDocument,
  server: URL,
  path: string,
  item: OpenApiPathItem,
  operation: OpenApiOperation
): Planned<ApiOperation> => {
  const isSitePath = path.startsWith('/')
  if (!isSitePath) return skipped('its path does not start with "/"')
  const isUnsafe = UNSAFE_LINK.test(path)
  if (isUnsafe) return skipped('its path suggests it ends a session or changes data')

  const parameters = planParameters(document, item, operation)
  if (parameters.kind === 'skipped') return parameters
  const url = planUrl(path, parameters.value, server)
  if (url.kind === 'skipped') return url
  const responses = planResponses(document, operation)
  if (responses.kind === 'skipped') return responses

  const security = operation.security ?? document.security ?? []
  return planned({
    method: 'GET',
    path,
    url: url.value,
    secured: security.some((requirement) => Object.keys(requirement).length > 0),
    responses: responses.value
  })
}

// The requests a run makes from the site's OpenAPI document: its GET operations only, on the
// document's own site, up to `limit`. Every GET operation left out is listed with the reason.
export const planApiOperations = (
  document: OpenApiDocument,
  documentUrl: string,
  limit: number = API_OPERATION_LIMIT
): ApiOperationPlan => {
  const server = planServer(document, documentUrl)
  const operations: ApiOperation[] = []
  const skippedOperations: { path: string; reason: string }[] = []
  for (const [path, item] of Object.entries(document.paths)) {
    const operation = item.get
    const hasGetOperation = operation !== undefined
    if (!hasGetOperation) continue
    const plan =
      server.kind === 'skipped'
        ? server
        : planOperation(document, server.value, path, item, operation)
    const hasRoom = operations.length < limit
    if (plan.kind === 'skipped') skippedOperations.push({ path, reason: plan.reason })
    else if (hasRoom) operations.push(plan.value)
    else {
      skippedOperations.push({
        path,
        reason: `a run tests at most ${String(limit)} operations`
      })
    }
  }
  return { operations, skipped: skippedOperations }
}
