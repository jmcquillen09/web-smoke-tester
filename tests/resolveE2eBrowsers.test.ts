import assert from 'node:assert/strict'
import test from 'node:test'

import { E2eConfigurationError } from '../e2e/errors/E2eConfigurationError.ts'
import { resolveE2eBrowsers } from '../e2e/resolveE2eBrowsers.ts'

const isConfigurationError = (message: string) => (error: unknown) =>
  error instanceof E2eConfigurationError && error.message === message

void test('a named browser runs the suite in that browser alone', () => {
  assert.deepEqual(resolveE2eBrowsers('firefox'), ['firefox'])
})

void test('all runs the suite in every browser', () => {
  assert.deepEqual(resolveE2eBrowsers('all'), ['chrome', 'firefox', 'safari', 'edge'])
})

void test('a comma-separated list runs the suite in exactly those browsers, in the order given', () => {
  assert.deepEqual(resolveE2eBrowsers('safari,chrome,firefox'), ['safari', 'chrome', 'firefox'])
})

void test('an unknown browser stops the run and names every accepted choice', () => {
  assert.throws(
    () => resolveE2eBrowsers('chromium'),
    isConfigurationError(
      'Unknown e2e browser "chromium". Expected one of: chrome, firefox, safari, edge, all, or a comma-separated list of browsers.'
    )
  )
})

void test('an unknown browser inside a list stops the run and names it', () => {
  assert.throws(
    () => resolveE2eBrowsers('chrome,webkit'),
    isConfigurationError(
      'Unknown e2e browser "webkit". Expected one of: chrome, firefox, safari, edge, all, or a comma-separated list of browsers.'
    )
  )
})

void test('an empty entry in a list stops the run instead of being skipped', () => {
  assert.throws(
    () => resolveE2eBrowsers('chrome,'),
    isConfigurationError(
      'Unknown e2e browser "". Expected one of: chrome, firefox, safari, edge, all, or a comma-separated list of browsers.'
    )
  )
})

void test('all inside a list stops the run, since it already means every browser', () => {
  assert.throws(
    () => resolveE2eBrowsers('chrome,all'),
    isConfigurationError(
      '"all" cannot be part of a browser list ("chrome,all"); use it on its own.'
    )
  )
})

void test('a list naming a browser twice stops the run instead of running it twice', () => {
  assert.throws(
    () => resolveE2eBrowsers('chrome,firefox,chrome'),
    isConfigurationError('The browser list "chrome,firefox,chrome" names a browser more than once.')
  )
})
