#!/usr/bin/env node
// `npm run serve:demo-site`: serves the bundled demo site until stopped, to look at it by hand.
// A run against `demo-site` serves its own and needs this one stopped.

import { DEMO_SITE_HOST, DEMO_SITE_PORT } from '../demo/constants.ts'
import { demoSite } from '../demo/demoSite.ts'
import { serveDemoServer } from '../demo/serveDemoServer.ts'

await serveDemoServer('serve:demo-site', demoSite, DEMO_SITE_HOST, DEMO_SITE_PORT)
