// A same-site link a visitor clicked, and where it took them.
export interface FollowedLink {
  /** The page the link was on. */
  readonly from: string
  /** The page the browser landed on. */
  readonly to: string
  /** The link's own address, as the page resolved it. */
  readonly href: string
}
