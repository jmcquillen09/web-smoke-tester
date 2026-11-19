import assert from 'node:assert/strict'
import test from 'node:test'

import { activeE2eTarget } from '../e2e/activeE2eTarget.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

const TARGETS = JSON.stringify({
  defaultTarget: 'staging',
  targets: {
    staging: { baseUrl: 'https://staging.example.com' },
    production: { baseUrl: 'https://www.example.com' }
  }
})

// Runs `run` with E2E_TARGET set to `target` (unset for undefined), then restores it.
const withTargetVariable = (target: string | undefined, run: () => void): void => {
  const saved = process.env['E2E_TARGET']
  if (target === undefined) delete process.env['E2E_TARGET']
  else process.env['E2E_TARGET'] = target
  try {
    run()
  } finally {
    if (saved === undefined) delete process.env['E2E_TARGET']
    else process.env['E2E_TARGET'] = saved
  }
}

void test('without E2E_TARGET the file’s default target is the active one', () => {
  withTargetVariable(undefined, () => {
    assert.equal(activeE2eTarget(writeTargetsFile(TARGETS)).baseUrl, 'https://staging.example.com')
  })
})

void test('E2E_TARGET picks another target from the file', () => {
  withTargetVariable('production', () => {
    const settings = activeE2eTarget(writeTargetsFile(TARGETS))

    assert.equal(settings.target, 'production')
    assert.equal(settings.baseUrl, 'https://www.example.com')
  })
})

void test('an empty E2E_TARGET falls back to the default target', () => {
  withTargetVariable('', () => {
    assert.equal(activeE2eTarget(writeTargetsFile(TARGETS)).target, 'staging')
  })
})

void test('an E2E_TARGET the file does not hold is a configuration error', () => {
  withTargetVariable('nowhere', () => {
    assert.throws(() => activeE2eTarget(writeTargetsFile(TARGETS)), {
      name: 'E2eConfigurationError',
      message: /Unknown e2e target "nowhere"/
    })
  })
})

void test('the repo’s own targets file is valid and its default target resolves', () => {
  withTargetVariable(undefined, () => {
    assert.match(activeE2eTarget().baseUrl, /^https?:\/\//)
  })
})
