import assert from 'node:assert/strict'
import test from 'node:test'

import { activeE2ePages } from '../e2e/activeE2ePages.ts'

const SETTINGS = {
  target: 'staging',
  baseUrl: 'https://staging.example.com',
  paths: ['/', '/pricing'],
  crawlLimit: 10,
  ignoreHttpsErrors: false,
  blockTracking: true,
  apiSpecPaths: ['/openapi.json']
}

void test('without pages from the runner, a run tests the target’s own paths', () => {
  assert.deepEqual(activeE2ePages(SETTINGS, {}), ['/', '/pricing'])
  assert.deepEqual(activeE2ePages(SETTINGS, { E2E_SITE_PAGES: '' }), ['/', '/pricing'])
})

void test('the pages the runner found replace the target’s own, without repeats', () => {
  const env = { E2E_SITE_PAGES: JSON.stringify(['/', '/pricing', '/about', '/']) }

  assert.deepEqual(activeE2ePages(SETTINGS, env), ['/', '/pricing', '/about'])
})

void test('pages that are not a JSON list of site paths are a configuration error', () => {
  for (const value of ['not json', '{}', '[]', '["about"]', '[1]']) {
    assert.throws(() => activeE2ePages(SETTINGS, { E2E_SITE_PAGES: value }), {
      name: 'E2eConfigurationError'
    })
  }
})
