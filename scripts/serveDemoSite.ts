#!/usr/bin/env node
// `npm run serve:demo-site [address]`: serves the bundled demo site until stopped, at the
// demo-site target's address unless another is given.

import { DEMO_SITE_HOST, DEMO_SITE_PORT } from '../demo/constants.ts'
import { demoSite } from '../demo/demoSite.ts'
import { serveDemoServer } from '../demo/serveDemoServer.ts'

const [address = `http://${DEMO_SITE_HOST}:${String(DEMO_SITE_PORT)}`] = process.argv.slice(2)

await serveDemoServer('serve:demo-site', demoSite, address)
