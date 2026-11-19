import assert from 'node:assert/strict'
import test from 'node:test'

import { findUnrequestedExpectedApiFailures } from '../e2e/findUnrequestedExpectedApiFailures.ts'

const OPERATIONS = [{ path: '/books' }, { path: '/authors' }]

void test('expected failures on operations the run requests are all requested', () => {
  const settings = { expectedApiFailures: [{ path: '/authors', check: 'status' as const }] }

  assert.deepEqual(findUnrequestedExpectedApiFailures(settings, OPERATIONS), [])
  assert.deepEqual(findUnrequestedExpectedApiFailures({ expectedApiFailures: [] }, OPERATIONS), [])
})

void test('an expected failure on an operation the run does not request is found, once per path', () => {
  const settings = {
    expectedApiFailures: [
      { path: '/authrs', check: 'status' as const },
      { path: '/authors', check: 'status' as const },
      { path: '/authrs', check: 'contentType' as const },
      { path: '/dropped', check: 'status' as const }
    ]
  }

  assert.deepEqual(findUnrequestedExpectedApiFailures(settings, OPERATIONS), [
    '/authrs',
    '/dropped'
  ])
})
