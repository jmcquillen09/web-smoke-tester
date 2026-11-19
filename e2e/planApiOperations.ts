import type { ApiOperation } from './ApiOperation.ts'
import { API_OPERATION_LIMIT, UNSAFE_LINK } from './constants.ts'
import { isSafeAddress } from './isSafeAddress.ts'
import { isSitePath } from './isSitePath.ts'
import type { OpenApiDocument } from './OpenApiDocument.ts'

export interface ApiOperationPlan {
  readonly operations: readonly ApiOperation[]
  /** The GET operations the run leaves out, each with why. */
  readonly skipped: readonly { readonly path: string; readonly reason: string }[]
  /** The skipped operations that lack only a value for one path parameter, with that parameter. */
  readonly awaitingPathValues: readonly {
    readonly path: string
    readonly parameter: string
    /** The address one level up, whose answer would list a value; empty when the path has none. */
    readonly listUrl: string
  }[]
}

/** Values for path parameters the document gives no example for, by operation path then parameter. */
export type ListedPathValues = ReadonlyMap<string, ReadonlyMap<string, string>>

interface PlannedValue<T> {
  readonly kind: 'planned'
  readonly value: T
}
interface SkippedValue {
  readonly kind: 'skipped'
  readonly reason: string
}
// Skipped for want of one path parameter's value, which a list operation's answer may still give.
interface AwaitingValue {
  readonly kind: 'awaiting'
  readonly reason: string
  readonly parameter: string
  readonly listUrl: string
}
type Planned<T> = PlannedValue<T> | SkippedValue | AwaitingValue

type OpenApiPathItem = OpenApiDocument['paths'][string]
type OpenApiOperation = NonNullable<OpenApiPathItem['get']>
type OpenApiComponents = NonNullable<OpenApiDocument['components']>
interface OpenApiReference {
  readonly $ref: string
}
type OpenApiParameter = Exclude<
  NonNullable<OpenApiComponents['parameters']>[string],
  OpenApiReference
>
type OpenApiResponse = Exclude<
  NonNullable<OpenApiComponents['responses']>[string],
  OpenApiReference
>
type OpenApiServers = OpenApiDocument['servers']

const PARAMETER_REFERENCE = '#/components/parameters/'
const RESPONSE_REFERENCE = '#/components/responses/'

const API_KEY_SCHEME = 'apiKey'
const NO_LISTED_VALUES: ReadonlyMap<string, string> = new Map()

const planned = <T>(value: T): Planned<T> => ({ kind: 'planned', value })
const skipped = (reason: string): SkippedValue => ({ kind: 'skipped', reason })
const isPlanned = <T>(plan: Planned<T>): plan is PlannedValue<T> => plan.kind === 'planned'
const isAwaiting = <T>(plan: Planned<T>): plan is AwaitingValue => plan.kind === 'awaiting'
const isReference = (entry: object): entry is OpenApiReference => '$ref' in entry

// The definition a `$ref` names in one components section; undefined when it names none there, or
// names another `$ref`.
const resolveComponent = <T extends object>(
  reference: string,
  prefix: string,
  components: Readonly<Record<string, T | OpenApiReference>> = {}
): T | undefined => {
  const hasPrefix = reference.startsWith(prefix)
  const name = hasPrefix ? reference.slice(prefix.length) : ''
  const hasComponent = Object.hasOwn(components, name)
  const component = hasComponent ? components[name] : undefined
  const isDefinition = component !== undefined && !isReference(component)
  return isDefinition ? component : undefined
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
      ? resolveComponent<OpenApiParameter>(
          entry.$ref,
          PARAMETER_REFERENCE,
          document.components?.parameters
        )
      : entry
    const isResolved = parameter !== undefined
    if (!isResolved)
      return skipped(
        "it has a parameter $ref that names no definition in the document's components"
      )
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

const addressOn = (server: URL, path: string): URL =>
  new URL(`${server.pathname.replace(/\/$/, '')}${path}`, server.origin)

// The address one level up from a path parameter that is a whole segment: `/books/1/reviews` for
// `{reviewId}` in `/books/1/reviews/{reviewId}`. Empty when the parameter has no such level.
const listUrlOf = (server: URL, filledPath: string, parameter: string): string => {
  const segments = filledPath.split('/')
  const parameterIndex = segments.indexOf(`{${parameter}}`)
  const hasListSegment = parameterIndex > 1
  return hasListSegment ? addressOn(server, segments.slice(0, parameterIndex).join('/')).href : ''
}

// Where a parameter's placeholder stands in the path; past its end for one the path does not hold.
const placeInPath = (path: string, parameter: OpenApiParameter): number => {
  const place = parameter.in === 'path' ? path.indexOf(`{${parameter.name}}`) : -1
  const isInPath = place !== -1
  return isInPath ? place : path.length
}

// The address to request: required path and query parameters take the document's own example
// values, and a path parameter without one takes its listed value, outermost first.
const planUrl = (
  path: string,
  parameters: readonly OpenApiParameter[],
  server: URL,
  credentialQueryNames: ReadonlySet<string>,
  listedValues: ReadonlyMap<string, string>
): Planned<string> => {
  let filledPath = path
  const query = new URLSearchParams()
  const inPathOrder = [...parameters].sort(
    (one, other) => placeInPath(path, one) - placeInPath(path, other)
  )
  for (const parameter of inPathOrder) {
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
    const listedValue = isPathParameter ? listedValues.get(parameter.name) : undefined
    const value = exampleOf(parameter) ?? listedValue
    const hasValue = value !== undefined
    if (!hasValue) {
      const reason = `the document gives no example value for its ${parameter.in} parameter "${parameter.name}"`
      return isPathParameter
        ? {
            kind: 'awaiting',
            reason,
            parameter: parameter.name,
            listUrl: listUrlOf(server, filledPath, parameter.name)
          }
        : skipped(reason)
    }
    if (isPathParameter) {
      filledPath = filledPath.replaceAll(`{${parameter.name}}`, encodeURIComponent(String(value)))
    } else {
      query.set(parameter.name, String(value))
    }
  }
  const isFilled = !filledPath.includes('{')
  if (!isFilled) return skipped('its path has a placeholder the document declares no parameter for')
  const url = addressOn(server, filledPath)
  url.search = query.toString()
  const isServerSite = url.origin === server.origin
  if (!isServerSite) return skipped(`its address ${url.href} is on another site than its server`)
  const hasSafeAddress = isSafeAddress(url)
  if (!hasSafeAddress) return skipped('its address suggests it ends a session or changes data')
  return planned(url.href)
}

const planResponses = (
  document: OpenApiDocument,
  operation: OpenApiOperation
): Planned<ApiOperation['responses']> => {
  const responses: ApiOperation['responses'] = []
  for (const [status, entry] of Object.entries(operation.responses ?? {})) {
    const response: OpenApiResponse | undefined = isReference(entry)
      ? resolveComponent<OpenApiResponse>(
          entry.$ref,
          RESPONSE_REFERENCE,
          document.components?.responses
        )
      : entry
    const isResolved = response !== undefined
    if (!isResolved)
      return skipped("it has a response $ref that names no definition in the document's components")
    responses.push({ status, contentTypes: Object.keys(response.content ?? {}) })
  }
  return planned(responses)
}

const planOperation = (
  document: OpenApiDocument,
  documentUrl: string,
  path: string,
  item: OpenApiPathItem,
  operation: OpenApiOperation,
  listedValues: ReadonlyMap<string, string>
): Planned<ApiOperation> => {
  const hasSitePath = isSitePath(path)
  if (!hasSitePath) return skipped('its path does not start with one "/"')
  const isSafePath = !UNSAFE_LINK.test(path)
  if (!isSafePath) return skipped('its path suggests it ends a session or changes data')

  const server = planServer(operation.servers ?? item.servers ?? document.servers, documentUrl)
  if (!isPlanned(server)) return server
  const parameters = planParameters(document, item, operation)
  if (!isPlanned(parameters)) return parameters
  const url = planUrl(
    path,
    parameters.value,
    server.value,
    credentialQueryNamesOf(document),
    listedValues
  )
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
  limit: number = API_OPERATION_LIMIT,
  listedValues: ListedPathValues = new Map()
): ApiOperationPlan => {
  const operations: ApiOperation[] = []
  const skippedOperations: { path: string; reason: string }[] = []
  const awaitingPathValues: { path: string; parameter: string; listUrl: string }[] = []
  for (const [path, item] of Object.entries(document.paths)) {
    const operation = item.get
    const hasGetOperation = operation !== undefined
    if (!hasGetOperation) continue
    const plan = planOperation(
      document,
      documentUrl,
      path,
      item,
      operation,
      listedValues.get(path) ?? NO_LISTED_VALUES
    )
    const hasRoom = operations.length < limit
    if (isAwaiting(plan)) {
      awaitingPathValues.push({ path, parameter: plan.parameter, listUrl: plan.listUrl })
    }
    if (!isPlanned(plan)) skippedOperations.push({ path, reason: plan.reason })
    else if (hasRoom) operations.push(plan.value)
    else {
      skippedOperations.push({
        path,
        reason: `a run tests at most ${String(limit)} operations`
      })
    }
  }
  return { operations, skipped: skippedOperations, awaitingPathValues }
}
