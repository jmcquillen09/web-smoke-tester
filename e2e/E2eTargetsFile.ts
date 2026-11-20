import { z } from 'zod'
import { ApiCheck } from './ApiCheck.ts'

// One site in targets.json. Only `baseUrl` is required.
const E2eTargetDefinitionSchema = z
  .object({
    /** The site's address, with its start path if it has one: `https://www.example.com`. */
    baseUrl: z.string(),
    /** The pages every run tests, as paths from the site's root; the base URL's own path when absent. */
    paths: z.array(z.string()).optional(),
    /** How many more pages the runner may add by following same-site links; 0 turns the crawl off. */
    crawlLimit: z.number().int().min(0).optional(),
    /** Accept a self-signed or otherwise invalid certificate, as a local or staging site may have. */
    ignoreHttpsErrors: z.boolean().optional(),
    /** Whether analytics and marketing scripts are kept from loading; true when absent. */
    blockTracking: z.boolean().optional(),
    /** The desktop browser window's size, in place of the browser's own default. */
    viewport: z
      .object({ width: z.number().int().positive(), height: z.number().int().positive() })
      .strict()
      .optional(),
    /** Where the site's OpenAPI or Swagger document is, or the docs page that shows it, as a path from the site's root; the usual addresses are tried when absent. */
    apiSpecPath: z.string().optional(),
    /** Whether a run serves the bundled demo site, pages and API, at `baseUrl` for the length of the run; false when absent. */
    servesDemoSite: z.boolean().optional(),
    /** The API checks known to fail on this site, each an operation's path as its document writes it and the check; none when absent. */
    expectedApiFailures: z
      .array(z.object({ path: z.string().startsWith('/'), check: z.enum(ApiCheck) }).strict())
      .optional(),
    /** A reason that stops every run against this target until the line is removed. */
    disabled: z.string().min(1).optional()
  })
  .strict()

// targets.json: every site a run can name, and the one a run without a name uses.
export const E2eTargetsFileSchema = z
  .object({
    defaultTarget: z.string().min(1),
    targets: z.record(z.string(), E2eTargetDefinitionSchema)
  })
  .strict()

export type E2eTargetDefinition = z.infer<typeof E2eTargetDefinitionSchema>
export type E2eTargetsFile = z.infer<typeof E2eTargetsFileSchema>
