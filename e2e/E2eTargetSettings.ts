import type { ApiCheck } from './ApiCheck.ts'

// What a run knows about the site it tests, resolved from the target's entry in targets.json.
export interface E2eTargetSettings {
  /** The target's name in targets.json. */
  readonly target: string
  /** The site's origin (`https://www.example.com`), which every page path is resolved against. */
  readonly baseUrl: string
  /** The pages every run tests, as paths from the site's root. */
  readonly paths: readonly string[]
  /** How many more pages the runner may add by following same-site links. */
  readonly crawlLimit: number
  readonly ignoreHttpsErrors: boolean
  /** Whether analytics and marketing scripts are kept from loading. */
  readonly blockTracking: boolean
  /** Where an API run looks for the site's OpenAPI document, in order, as paths from the site's root. */
  readonly apiSpecPaths: readonly string[]
  /** Whether an API run serves the bundled demo API at `baseUrl` for the length of the run. */
  readonly servesDemoApi: boolean
  /** Whether a site run serves the bundled demo site at `baseUrl` for the length of the run. */
  readonly servesDemoSite: boolean
  /** The API checks known to fail on this site: reported as expected failures, and a failed run once one passes. */
  readonly expectedApiFailures: readonly { readonly path: string; readonly check: ApiCheck }[]
  /** The desktop browser window's size; absent for the browser's own default. */
  readonly viewport?: { readonly width: number; readonly height: number }
}
