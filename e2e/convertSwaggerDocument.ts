import { PARAMETER_REFERENCE, RESPONSE_REFERENCE, SCHEMA_REFERENCE } from './constants.ts'
import type { Json } from './Json.ts'
import type { JsonObject } from './JsonObject.ts'
import { mapJsonSchemas } from './mapJsonSchemas.ts'
import type { SwaggerDocument } from './SwaggerDocument.ts'

type SwaggerPathItem = SwaggerDocument['paths'][string]
type SwaggerOperation = NonNullable<SwaggerPathItem['get']>
type SharedResponses = NonNullable<SwaggerDocument['responses']>

// A Swagger 2.0 schema is written as an OpenAPI 3.0 one is: the same JSON Schema draft, with a
// flag for an exclusive bound.
const OPENAPI_VERSION = '3.0.3'
// Where a Swagger 2.0 document keeps the responses its operations share.
const SWAGGER_RESPONSE_REFERENCE = '#/responses/'
// Where a Swagger 2.0 document keeps what a `$ref` points at, and where an OpenAPI 3 one does.
const MOVED_REFERENCES = [
  { swagger: '#/definitions/', openApi: SCHEMA_REFERENCE },
  { swagger: '#/parameters/', openApi: PARAMETER_REFERENCE },
  { swagger: SWAGGER_RESPONSE_REFERENCE, openApi: RESPONSE_REFERENCE }
]
// How a Swagger 2.0 document writes what OpenAPI 3 calls `example` and `nullable`.
const SWAGGER_EXAMPLE = 'x-example'
const SWAGGER_NULLABLE = 'x-nullable'
// What a Swagger 2.0 parameter says beside its name that an OpenAPI 3 one says under `schema`.
const PARAMETER_SCHEMA_KEYWORDS: readonly string[] = ['default', 'enum']
// What a response with a body answers in when the document names no content type.
const ANY_CONTENT_TYPE: readonly string[] = ['*/*']

const mapValues = <T>(
  entries: Readonly<Record<string, T>>,
  convert: (value: T) => Json
): JsonObject =>
  Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, convert(value)]))

const openApiReferenceOf = (reference: string): string => {
  const moved = MOVED_REFERENCES.find(({ swagger }) => reference.startsWith(swagger))
  const isMoved = moved !== undefined
  return isMoved ? `${moved.openApi}${reference.slice(moved.swagger.length)}` : reference
}

const asOpenApiSchema = (schema: Record<string, Json>): Json => {
  const reference = schema['$ref'] ?? false
  const isReference = typeof reference === 'string'
  if (isReference) schema['$ref'] = openApiReferenceOf(reference)
  const hasNullableFlag = Object.hasOwn(schema, SWAGGER_NULLABLE)
  if (hasNullableFlag) {
    schema['nullable'] = schema[SWAGGER_NULLABLE] ?? false
    Reflect.deleteProperty(schema, SWAGGER_NULLABLE)
  }
  return schema
}

// An entry that points at a definition points at where an OpenAPI 3 document keeps it; any other
// entry is converted.
const convertEntry = (
  entry: JsonObject,
  convert: (entry: JsonObject) => JsonObject
): JsonObject => {
  const reference = entry['$ref'] ?? false
  const isReference = typeof reference === 'string'
  return isReference ? { $ref: openApiReferenceOf(reference) } : convert(entry)
}

const asOpenApiParameter = (parameter: JsonObject): JsonObject => {
  const entries = Object.entries(parameter)
  return {
    ...Object.fromEntries(
      entries.map(([key, held]) => [key === SWAGGER_EXAMPLE ? 'example' : key, held])
    ),
    schema: Object.fromEntries(entries.filter(([key]) => PARAMETER_SCHEMA_KEYWORDS.includes(key)))
  }
}

// A response's one schema is its body in each content type the operation answers in.
const asOpenApiResponse = (response: JsonObject, contentTypes: readonly string[]): JsonObject => {
  const hasBody = Object.hasOwn(response, 'schema')
  if (!hasBody) return {}
  const schema = mapJsonSchemas(response['schema'] ?? false, asOpenApiSchema)
  return {
    content: Object.fromEntries(contentTypes.map((contentType) => [contentType, { schema }]))
  }
}

const asOpenApiParameters = (parameters: readonly JsonObject[] = []): JsonObject[] =>
  parameters.map((parameter) => convertEntry(parameter, asOpenApiParameter))

// The shared response an entry points at, written out in its place: its body comes in the content
// types of the operation that points at it. An entry that points at none stays as it is.
const sharedResponseOf = (entry: JsonObject, sharedResponses: SharedResponses): JsonObject => {
  const reference = entry['$ref'] ?? false
  const isSharedReference =
    typeof reference === 'string' && reference.startsWith(SWAGGER_RESPONSE_REFERENCE)
  const name = isSharedReference ? reference.slice(SWAGGER_RESPONSE_REFERENCE.length) : ''
  const shared = Object.hasOwn(sharedResponses, name) ? sharedResponses[name] : undefined
  return shared ?? entry
}

const asOpenApiResponses = (
  operation: SwaggerOperation,
  sharedResponses: SharedResponses,
  documentProduces: readonly string[]
): JsonObject => {
  const produces = operation.produces ?? documentProduces
  const hasContentTypes = produces.length > 0
  const contentTypes = hasContentTypes ? produces : ANY_CONTENT_TYPE
  return mapValues(operation.responses ?? {}, (response) =>
    convertEntry(sharedResponseOf(response, sharedResponses), (entry) =>
      asOpenApiResponse(entry, contentTypes)
    )
  )
}

const asOpenApiOperation = (operation: SwaggerOperation, swagger: SwaggerDocument): JsonObject => {
  const { security } = operation
  const hasOwnSecurity = security !== undefined
  return {
    parameters: asOpenApiParameters(operation.parameters),
    responses: asOpenApiResponses(operation, swagger.responses ?? {}, swagger.produces ?? []),
    ...(hasOwnSecurity ? { security } : {})
  }
}

const asOpenApiPathItem = (item: SwaggerPathItem, swagger: SwaggerDocument): JsonObject => {
  const { get: operation } = item
  const hasGetOperation = operation !== undefined
  return {
    parameters: asOpenApiParameters(item.parameters),
    ...(hasGetOperation ? { get: asOpenApiOperation(operation, swagger) } : {})
  }
}

// One server for each scheme the document names, at its host and base path; the document's own
// scheme and host stand in for the ones it leaves out.
const serversOf = (swagger: SwaggerDocument): JsonObject[] => {
  const { host = '', basePath = '/', schemes = [] } = swagger
  const hasHost = host !== ''
  if (!hasHost) return [{ url: basePath }]
  const address = `//${host}${basePath}`
  const hasSchemes = schemes.length > 0
  return hasSchemes
    ? schemes.map((scheme) => ({ url: `${scheme}:${address}` }))
    : [{ url: address }]
}

// A Swagger 2.0 document as the OpenAPI 3 document that says the same, for `OpenApiDocumentSchema`
// to read: only the parts a run reads are carried over. A shared response is written out in each
// operation that points at it, so the document's own `responses` have no counterpart.
export const convertSwaggerDocument = (swagger: SwaggerDocument): JsonObject => {
  return {
    openapi: OPENAPI_VERSION,
    servers: serversOf(swagger),
    security: swagger.security ?? [],
    paths: mapValues(swagger.paths, (item) => asOpenApiPathItem(item, swagger)),
    components: {
      parameters: mapValues(swagger.parameters ?? {}, (parameter) =>
        convertEntry(parameter, asOpenApiParameter)
      ),
      schemas: mapValues(swagger.definitions ?? {}, (schema) =>
        mapJsonSchemas(schema, asOpenApiSchema)
      ),
      securitySchemes: swagger.securityDefinitions ?? {}
    }
  }
}
