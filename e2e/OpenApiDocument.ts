import { z } from 'zod'

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
  content: z.record(z.string(), z.object({})).optional()
})

const OpenApiSecuritySchema = z.array(z.record(z.string(), z.array(z.string())))

const OpenApiOperationSchema = z.object({
  parameters: z.array(z.union([OpenApiReferenceSchema, OpenApiParameterSchema])).optional(),
  /** The responses the operation declares, by status (`200`), range (`2XX`) or `default`. */
  responses: z
    .record(z.string(), z.union([OpenApiReferenceSchema, OpenApiResponseSchema]))
    .optional(),
  security: OpenApiSecuritySchema.optional()
})

const OpenApiPathItemSchema = z.object({
  get: OpenApiOperationSchema.optional(),
  parameters: z.array(z.union([OpenApiReferenceSchema, OpenApiParameterSchema])).optional()
})

// The parts of an OpenAPI 3 document a run reads. The document is the site's own, so the keys this
// schema does not name are dropped rather than refused.
export const OpenApiDocumentSchema = z.object({
  openapi: z.string().startsWith('3.'),
  servers: z.array(z.object({ url: z.string() })).optional(),
  security: OpenApiSecuritySchema.optional(),
  paths: z.record(z.string(), OpenApiPathItemSchema),
  components: z
    .object({
      parameters: z.record(z.string(), OpenApiParameterSchema).optional(),
      responses: z.record(z.string(), OpenApiResponseSchema).optional()
    })
    .optional()
})

export type OpenApiDocument = z.infer<typeof OpenApiDocumentSchema>
