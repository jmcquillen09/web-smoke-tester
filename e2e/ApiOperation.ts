import { z } from 'zod'

// One operation of the site's API a run requests, as the runner plans it from the OpenAPI document
// and hands it to Playwright.
export const ApiOperationSchema = z
  .object({
    method: z.literal('GET'),
    /** The path as the document writes it, with its `{placeholders}`. */
    path: z.string().startsWith('/'),
    /** The address a check requests: the path on the document's server, placeholders filled. */
    url: z.url(),
    /** Whether the document asks for credentials on this operation. */
    secured: z.boolean(),
    /** The responses the document declares, each with the content types it names for the body. */
    responses: z.array(z.object({ status: z.string(), contentTypes: z.array(z.string()) }).strict())
  })
  .strict()

export type ApiOperation = z.infer<typeof ApiOperationSchema>
