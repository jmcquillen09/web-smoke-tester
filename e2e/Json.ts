import type { z } from 'zod'

// Any JSON value: what a document's text holds once it is parsed.
export type Json = z.infer<ReturnType<typeof z.json>>
