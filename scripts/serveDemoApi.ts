#!/usr/bin/env node
// `npm run serve:demo-api`: serves the bundled demo API until stopped, to explore it by hand.
// `npm run test:api-playwright demo-api` serves its own and needs this one stopped.

import { DEMO_API_HOST, DEMO_API_PORT } from '../demo/constants.ts'
import { startDemoApiServer } from '../demo/startDemoApiServer.ts'

try {
  await startDemoApiServer(DEMO_API_PORT, DEMO_API_HOST)
  console.log(
    `serve:demo-api: the demo API is at http://${DEMO_API_HOST}:${String(DEMO_API_PORT)} (document: /openapi.json). Ctrl+C stops it.`
  )
} catch (error) {
  console.error(`serve:demo-api: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
