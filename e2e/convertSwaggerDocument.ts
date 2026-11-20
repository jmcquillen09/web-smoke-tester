import { PARAMETER_REFERENCE, RESPONSE_REFERENCE, SCHEMA_REFERENCE } from './constants.ts'
import type { Json } from './Json.ts'
import type { JsonObject } from './JsonObject.ts'
import { mapJsonSchemas } from './mapJsonSchemas.ts'
import type { SwaggerDocument } from './SwaggerDocument.ts'

type SwaggerPathItem = SwaggerDocument['paths'][string]
type SwaggerOperation = NonNullable<SwaggerPathItem['get']>

// A Swagger 2.0 schema is written as an OpenAPI 3.0 one is: the same JSON Schema draft, with a
// flag for an exclusive bound.
const OPENAPI_VERSION = '3.0.3'
// Where a Swagger 2.0 document keeps what a `$ref` points at, and where an OpenAPI 3 one does.
const MOVED_REFERENCES = [
  { swagger: '#/definitions/', openApi: SCHEMA_REFERENCE },
  { swagger: '#/parameters/', openApi: PARAMETER_REFERENCE },
  { swagger: '#/responses/', openApi: RESPONSE_REFERENCE }
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
  if (typeof reference === 'string') schema['$ref'] = openApiReferenceOf(reference)
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
  return typeof reference === 'string' ? { $ref: openApiReferenceOf(reference) } : convert(entry)
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

const asOpenApiResponses = (
  responses: Readonly<Record<string, JsonObject>> = {},
  produces: readonly string[]
): JsonObject => {
  const hasContentTypes = produces.length > 0
  const contentTypes = hasContentTypes ? produces : ANY_CONTENT_TYPE
  return mapValues(responses, (response) =>
    convertEntry(response, (entry) => asOpenApiResponse(entry, contentTypes))
  )
}

const asOpenApiOperation = (
  operation: SwaggerOperation,
  documentProduces: readonly string[]
): JsonObject => {
  const { security } = operation
  const hasOwnSecurity = security !== undefined
  return {
    parameters: asOpenApiParameters(operation.parameters),
    responses: asOpenApiResponses(operation.responses, operation.produces ?? documentProduces),
    ...(hasOwnSecurity ? { security } : {})
  }
}

const asOpenApiPathItem = (
  item: SwaggerPathItem,
  documentProduces: readonly string[]
): JsonObject => {
  const { get: operation } = item
  const hasGetOperation = operation !== undefined
  return {
    parameters: asOpenApiParameters(item.parameters),
    ...(hasGetOperation ? { get: asOpenApiOperation(operation, documentProduces) } : {})
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
// to read: only the parts a run reads are carried over.
export const convertSwaggerDocument = (swagger: SwaggerDocument): JsonObject => {
  const documentProduces = swagger.produces ?? []
  return {
    openapi: OPENAPI_VERSION,
    servers: serversOf(swagger),
    security: swagger.security ?? [],
    paths: mapValues(swagger.paths, (item) => asOpenApiPathItem(item, documentProduces)),
    components: {
      parameters: mapValues(swagger.parameters ?? {}, (parameter) =>
        convertEntry(parameter, asOpenApiParameter)
      ),
      responses: asOpenApiResponses(swagger.responses, documentProduces),
      schemas: mapValues(swagger.definitions ?? {}, (schema) =>
        mapJsonSchemas(schema, asOpenApiSchema)
      ),
      securitySchemes: swagger.securityDefinitions ?? {}
    }
  }
}
