// What one API check came to on an answer.
export type ApiCheckResult =
  /** The answer was judged; `problems` lists what is wrong with it, one line each. */
  | { readonly kind: 'checked'; readonly problems: readonly string[] }
  /** There was nothing to judge the answer against; `reason` says why. */
  | { readonly kind: 'unchecked'; readonly reason: string }
