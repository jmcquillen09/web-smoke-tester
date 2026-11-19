import type { ApiOperation } from '../ApiOperation.ts'

// What the site's API answered one planned operation with.
export interface ApiAnswer {
  readonly operation: ApiOperation
  readonly status: number
  /** The answer's media type, lowercase and without parameters; empty when it names none. */
  readonly contentType: string
}
