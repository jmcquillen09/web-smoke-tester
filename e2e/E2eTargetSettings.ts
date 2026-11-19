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
  /** The desktop browser window's size; absent for the browser's own default. */
  readonly viewport?: { readonly width: number; readonly height: number }
}
