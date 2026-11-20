import { convertSwaggerDocument } from './convertSwaggerDocument.ts'
import { type OpenApiDocument, OpenApiDocumentSchema } from './OpenApiDocument.ts'
import { SwaggerDocumentSchema } from './SwaggerDocument.ts'

// What a text holds as JSON; undefined for a text that is not JSON.
const readJsonText = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// The OpenAPI 3 document a JSON text holds; a Swagger 2.0 document is read as the OpenAPI 3
// document that says the same. Undefined for a text that holds neither.
export const parseOpenApiDocument = (text: string): OpenApiDocument | undefined => {
  const content = readJsonText(text)
  const openApi = OpenApiDocumentSchema.safeParse(content)
  if (openApi.success) return openApi.data
  const swagger = SwaggerDocumentSchema.safeParse(content)
  if (!swagger.success) return undefined
  const converted = OpenApiDocumentSchema.safeParse(convertSwaggerDocument(swagger.data))
  return converted.success ? converted.data : undefined
}
