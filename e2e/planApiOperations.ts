import type { ApiOperation } from './ApiOperation.ts'
import { API_OPERATION_LIMIT, UNSAFE_LINK } from './constants.ts'
import { isSitePath } from './isSitePath.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'

export interface ApiOperationPlan {
  readonly operations: readonly ApiOperation[]
  /** The GET operations the run leaves out, each with why. */
  readonly skipped: readonly { readonly path: string; readonly reason: string }[]
}

interface PlannedValue<T> {
  readonly kind: 'planned'
  readonly value: T
}
interface SkippedValue {
  readonly kind: 'skipped'
  readonly reason: string
}
type Planned<T> = PlannedValue<T> | SkippedValue

type OpenApiPathItem = OpenApiDocument['paths'][string]
type OpenApiOperation = NonNullable<OpenApiPathItem['get']>
type OpenApiComponents = NonNullable<OpenApiDocument['components']>
type OpenApiParameter = NonNullable<OpenApiComponents['parameters']>[string]
type OpenApiResponse = NonNullable<OpenApiComponents['responses']>[string]
type OpenApiServers = OpenApiDocument['servers']

const PARAMETER_REFERENCE = '#/components/parameters/'
const RESPONSE_REFERENCE = '#/components/responses/'

const API_KEY_SCHEME = 'apiKey'

const planned = <T>(value: T): Planned<T> => ({ kind: 'planned', value })
const skipped = (reason: string): SkippedValue => ({ kind: 'skipped', reason })
const isPlanned = <T>(plan: Planned<T>): plan is PlannedValue<T> => plan.kind === 'planned'
const isReference = (entry: object): entry is { readonly $ref: string } => '$ref' in entry

// The component a `$ref` names, or undefined when it points anywhere but that components section.
const resolveComponent = <T>(
  reference: string,
  prefix: string,
  components: Readonly<Record<string, T>> = {}
): T | undefined => {
  const hasPrefix = reference.startsWith(prefix)
  const name = hasPrefix ? reference.slice(prefix.length) : ''
  const hasComponent = Object.hasOwn(components, name)
  return hasComponent ? components[name] : undefined
}

// The server an operation is requested on: the first of the servers that apply to it.
const planServer = (servers: OpenApiServers, documentUrl: string): Planned<URL> => {
  const address = servers?.[0]?.url ?? '/'
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
    const parameter = isReference(entry)
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

// The query parameters that carry a credential: the names of the document's query API keys.
const credentialQueryNamesOf = (document: OpenApiDocument): ReadonlySet<string> =>
  new Set(
    Object.values(document.components?.securitySchemes ?? {})
      .filter((scheme) => scheme.type === API_KEY_SCHEME && scheme.in === 'query')
      .map((scheme) => scheme.name ?? '')
  )

// The address to request: required path and query parameters take the document's own example values.
const planUrl = (
  path: string,
  parameters: readonly OpenApiParameter[],
  server: URL,
  credentialQueryNames: ReadonlySet<string>
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
    const isCredential = !isPathParameter && credentialQueryNames.has(parameter.name)
    if (isCredential) {
      return skipped(`it requires the credential query parameter "${parameter.name}"`)
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
  const isServerSite = url.origin === server.origin
  if (!isServerSite) return skipped(`its address ${url.href} is on another site than its server`)
  const isSafeAddress = !UNSAFE_LINK.test(`${url.pathname}${url.search}`)
  if (!isSafeAddress) return skipped('its address suggests it ends a session or changes data')
  return planned(url.href)
}

const planResponses = (
  document: OpenApiDocument,
  operation: OpenApiOperation
): Planned<ApiOperation['responses']> => {
  const responses: ApiOperation['responses'] = []
  for (const [status, entry] of Object.entries(operation.responses ?? {})) {
    const response: OpenApiResponse | undefined = isReference(entry)
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
  documentUrl: string,
  path: string,
  item: OpenApiPathItem,
  operation: OpenApiOperation
): Planned<ApiOperation> => {
  const hasSitePath = isSitePath(path)
  if (!hasSitePath) return skipped('its path does not start with one "/"')
  const isSafePath = !UNSAFE_LINK.test(path)
  if (!isSafePath) return skipped('its path suggests it ends a session or changes data')

  const server = planServer(operation.servers ?? item.servers ?? document.servers, documentUrl)
  if (!isPlanned(server)) return server
  const parameters = planParameters(document, item, operation)
  if (!isPlanned(parameters)) return parameters
  const url = planUrl(path, parameters.value, server.value, credentialQueryNamesOf(document))
  if (!isPlanned(url)) return url
  const responses = planResponses(document, operation)
  if (!isPlanned(responses)) return responses

  // An empty requirement among the alternatives lets a request through without credentials.
  const security = operation.security ?? document.security ?? []
  const requiresCredentials =
    security.length > 0 && security.every((requirement) => Object.keys(requirement).length > 0)
  return planned({
    method: 'GET',
    path,
    url: url.value,
    secured: requiresCredentials,
    responses: responses.value
  })
}

// The requests a run makes from the site's OpenAPI document: its GET operations on the document's
// own site, up to `limit`. Every GET operation left out is listed with the reason.
export const planApiOperations = (
  document: OpenApiDocument,
  documentUrl: string,
  limit: number = API_OPERATION_LIMIT
): ApiOperationPlan => {
  const operations: ApiOperation[] = []
  const skippedOperations: { path: string; reason: string }[] = []
  for (const [path, item] of Object.entries(document.paths)) {
    const operation = item.get
    const hasGetOperation = operation !== undefined
    if (!hasGetOperation) continue
    const plan = planOperation(document, documentUrl, path, item, operation)
    const hasRoom = operations.length < limit
    if (!isPlanned(plan)) skippedOperations.push({ path, reason: plan.reason })
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
