#!/usr/bin/env node
// `npm run typecheck`: typechecks the suite, its scripts and its unit tests.

import { createRequire } from 'node:module'
import path from 'node:path'
import { spawnChild } from '../support/spawnChild.ts'

const repoRoot = path.join(import.meta.dirname, '..')
// Node runs tsc's module directly; spawning `npx` fails on Windows, where it is a .cmd shim.
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')

try {
  const outcome = await spawnChild(
    process.execPath,
    [tsc, '-p', path.join(repoRoot, 'tsconfig.json'), ...process.argv.slice(2)],
    { stdio: 'inherit' }
  )
  process.exit(outcome.kind === 'exited' ? outcome.code : 1)
} catch (error) {
  console.error(`typecheck: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
