// A screen the responsive check lays a page out on.
export interface ResponsiveViewport {
  readonly name: string
  readonly width: number
  readonly height: number
  /** The Playwright device a handheld screen is emulated as; absent for a desktop screen. */
  readonly device?: string
}
