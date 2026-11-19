// What holding an answer's body against the document's schema came to.
export type ApiBodyValidation =
  /** The body was validated; `problems` lists what the schema does not allow, one line each. */
  | { readonly kind: 'validated'; readonly problems: readonly string[] }
  /** There was nothing to validate the body against; `reason` says why. */
  | { readonly kind: 'unvalidated'; readonly reason: string }
