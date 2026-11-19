import { z } from 'zod'
import { JsonObjectSchema } from './JsonObject.ts'

// A value a document offers for a parameter; anything else it offers (a list, an object) is not used.
const OpenApiExampleSchema = z.union([z.string(), z.number(), z.boolean()])
const OpenApiOptionalExampleSchema = OpenApiExampleSchema.optional().catch(undefined)

// A pointer to a definition under the document's `components`.
const OpenApiReferenceSchema = z.object({ $ref: z.string() })

const OpenApiParameterSchema = z.object({
  name: z.string(),
  /** Where the parameter goes: `path`, `query`, `header` or `cookie`. */
  in: z.string(),
  required: z.boolean().optional(),
  example: OpenApiOptionalExampleSchema,
  schema: z
    .object({
      example: OpenApiOptionalExampleSchema,
      default: OpenApiOptionalExampleSchema,
      enum: z.array(OpenApiExampleSchema).optional().catch(undefined)
    })
    .optional()
})

const OpenApiResponseSchema = z.object({
  /** The body's content types, each a key; absent when the response declares no body. */
  content: z
    .record(
      z.string(),
      /** The body's schema; one that is not an object (`true`, a list) is read as none. */
      z.object({ schema: JsonObjectSchema.optional().catch(undefined) })
    )
    .optional()
})

const OpenApiSecuritySchema = z.array(z.record(z.string(), z.array(z.string())))

const OpenApiServersSchema = z.array(z.object({ url: z.string() }))

const OpenApiOperationSchema = z.object({
  parameters: z.array(z.union([OpenApiReferenceSchema, OpenApiParameterSchema])).optional(),
  /** The responses the operation declares, by status (`200`), range (`2XX`) or `default`. */
  responses: z
    .record(z.string(), z.union([OpenApiReferenceSchema, OpenApiResponseSchema]))
    .optional(),
  security: OpenApiSecuritySchema.optional(),
  /** The servers this operation is served from, in place of the path's and the document's. */
  servers: OpenApiServersSchema.optional()
})

const OpenApiPathItemSchema = z.object({
  get: OpenApiOperationSchema.optional(),
  /** The servers this path's operations are served from, in place of the document's. */
  servers: OpenApiServersSchema.optional(),
  parameters: z.array(z.union([OpenApiReferenceSchema, OpenApiParameterSchema])).optional()
})

// The parts of an OpenAPI 3 document a run reads. The document is the site's own, so the keys this
// schema does not name are dropped rather than refused.
export const OpenApiDocumentSchema = z.object({
  openapi: z.string().startsWith('3.'),
  servers: OpenApiServersSchema.optional(),
  security: OpenApiSecuritySchema.optional(),
  paths: z.record(z.string(), OpenApiPathItemSchema),
  components: z
    .object({
      parameters: z
        .record(z.string(), z.union([OpenApiReferenceSchema, OpenApiParameterSchema]))
        .optional(),
      responses: z
        .record(z.string(), z.union([OpenApiReferenceSchema, OpenApiResponseSchema]))
        .optional(),
      /** The schemas the document's responses point at with `$ref`. */
      schemas: z.record(z.string(), z.json()).optional().catch(undefined),
      /** How a request proves who sends it; an `apiKey` scheme names the parameter carrying the key. */
      securitySchemes: z
        .record(
          z.string(),
          z.object({ type: z.string(), in: z.string().optional(), name: z.string().optional() })
        )
        .optional()
    })
    .optional()
})

export type OpenApiDocument = z.infer<typeof OpenApiDocumentSchema>
