#!/usr/bin/env node
// `npm run serve:demo-api`: serves the bundled demo API until stopped; its document is at
// /openapi.json. `npm run test:api-playwright demo-api` serves its own and needs this one stopped.

import { DEMO_API_HOST, DEMO_API_PORT } from '../demo/constants.ts'
import { demoApi } from '../demo/demoApi.ts'
import { serveDemoServer } from '../demo/serveDemoServer.ts'

await serveDemoServer('serve:demo-api', demoApi, DEMO_API_HOST, DEMO_API_PORT)
