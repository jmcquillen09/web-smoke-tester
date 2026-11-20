import { z } from 'zod'
import { JsonObjectSchema } from './JsonObject.ts'

const SwaggerEntriesSchema = z.record(z.string(), JsonObjectSchema)

const SwaggerOperationSchema = z.object({
  /** The content types the operation answers in, in place of the document's. */
  produces: z.array(z.string()).optional(),
  /** The schemes the operation is served over, in place of the document's. */
  schemes: z.array(z.string()).optional(),
  parameters: z.array(JsonObjectSchema).optional(),
  responses: SwaggerEntriesSchema.optional(),
  security: z.json().optional()
})

const SwaggerPathItemSchema = z.object({
  get: SwaggerOperationSchema.optional(),
  parameters: z.array(JsonObjectSchema).optional()
})

// The parts of a Swagger 2.0 document that say where each part of an OpenAPI 3 document comes
// from. What a parameter, response or schema holds is read once converted, by `OpenApiDocumentSchema`.
export const SwaggerDocumentSchema = z.object({
  swagger: z.literal('2.0'),
  /** The API's host, with its port; absent when the API is on the host that serves the document. */
  host: z.string().optional(),
  /** The path every operation's path follows. */
  basePath: z.string().optional(),
  schemes: z.array(z.string()).optional(),
  /** The content types the operations answer in, unless one names its own. */
  produces: z.array(z.string()).optional(),
  security: z.json().optional(),
  paths: z.record(z.string(), SwaggerPathItemSchema),
  parameters: SwaggerEntriesSchema.optional(),
  responses: SwaggerEntriesSchema.optional(),
  /** The schemas the document's responses point at with `$ref`. */
  definitions: z.record(z.string(), z.json()).optional().catch(undefined),
  securityDefinitions: SwaggerEntriesSchema.optional()
})

export type SwaggerDocument = z.infer<typeof SwaggerDocumentSchema>
