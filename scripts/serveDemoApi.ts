#!/usr/bin/env node
// `npm run serve:demo-api [address]`: serves the bundled demo API until stopped, at the demo-api
// target's address unless another is given. Its document is at /openapi.json.

import { DEMO_API_HOST, DEMO_API_PORT } from '../demo/constants.ts'
import { demoApi } from '../demo/demoApi.ts'
import { serveDemoServer } from '../demo/serveDemoServer.ts'

const [address = `http://${DEMO_API_HOST}:${String(DEMO_API_PORT)}`] = process.argv.slice(2)

await serveDemoServer('serve:demo-api', demoApi, address)
