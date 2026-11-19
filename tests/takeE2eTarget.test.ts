import assert from 'node:assert/strict'
import test from 'node:test'

import type { E2eTargetsFile } from '../e2e/E2eTargetsFile.ts'
import { takeE2eTarget } from '../e2e/takeE2eTarget.ts'

const TARGETS: E2eTargetsFile = {
  defaultTarget: 'staging',
  targets: {
    staging: { baseUrl: 'https://staging.example.com' },
    local: { baseUrl: 'http://localhost:3000' }
  }
}

void test('a first argument that is not a flag is the target, and the rest is kept in order', () => {
  const taken = takeE2eTarget(['local', 'e2e/seo.spec.ts', '--headed'], TARGETS)

  assert.equal(taken.settings.target, 'local')
  assert.deepEqual(taken.rest, ['e2e/seo.spec.ts', '--headed'])
})

void test('without a target argument the run uses the default target and keeps every argument', () => {
  assert.equal(takeE2eTarget([], TARGETS).settings.target, 'staging')

  const taken = takeE2eTarget(['--headed', 'local'], TARGETS)

  assert.equal(taken.settings.target, 'staging')
  assert.deepEqual(taken.rest, ['--headed', 'local'])
})

void test('a target argument the file does not hold is a configuration error', () => {
  assert.throws(() => takeE2eTarget(['nowhere'], TARGETS), { name: 'E2eConfigurationError' })
})
