// How a child process ended: with an exit code, or killed by a signal.
export type ChildOutcome =
  | { readonly kind: 'exited'; readonly code: number }
  | { readonly kind: 'signalled'; readonly signal: NodeJS.Signals }
