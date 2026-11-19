// A page of the site as the browser loaded it.
export interface LoadedPage {
  /** The path the test asked for, from the site's root. */
  readonly path: string
  /** Where the browser ended up, after any redirect. */
  readonly url: string
  /** The status the page's own document answered with. */
  readonly status: number
  readonly title: string
}
