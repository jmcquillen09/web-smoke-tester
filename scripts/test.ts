#!/usr/bin/env node
// `npm test [-- args...]`: the suite's own unit tests under tests/, on Node's test runner. They need
// no browser and no live site.

import path from 'node:path'
import { spawnChild } from '../support/spawnChild.ts'

const repoRoot = path.join(import.meta.dirname, '..')

try {
  const outcome = await spawnChild(
    process.execPath,
    ['--test', path.join(repoRoot, 'tests/*.test.ts'), ...process.argv.slice(2)],
    { cwd: repoRoot, stdio: 'inherit' }
  )
  process.exit(outcome.kind === 'exited' ? outcome.code : 1)
} catch (error) {
  console.error(`test: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
