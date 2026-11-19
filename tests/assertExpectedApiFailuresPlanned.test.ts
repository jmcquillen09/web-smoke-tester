import assert from 'node:assert/strict'
import test from 'node:test'

import { assertExpectedApiFailuresPlanned } from '../e2e/assertExpectedApiFailuresPlanned.ts'

const OPERATIONS = [{ path: '/books' }, { path: '/authors' }]

void test('expected failures on operations the run requests are accepted', () => {
  const settings = {
    target: 'staging',
    expectedApiFailures: [{ path: '/authors', check: 'status' as const }]
  }

  assert.doesNotThrow(() => {
    assertExpectedApiFailuresPlanned(settings, OPERATIONS)
  })
  assert.doesNotThrow(() => {
    assertExpectedApiFailuresPlanned({ target: 'staging', expectedApiFailures: [] }, OPERATIONS)
  })
})

void test('an expected failure on an operation the run does not request stops the run', () => {
  const settings = {
    target: 'staging',
    expectedApiFailures: [
      { path: '/authrs', check: 'status' as const },
      { path: '/authrs', check: 'contentType' as const }
    ]
  }

  assert.throws(
    () => {
      assertExpectedApiFailuresPlanned(settings, OPERATIONS)
    },
    {
      name: 'E2eConfigurationError',
      message:
        'The staging target expects a failure on GET /authrs, which this run does not request. Requested: GET /books, GET /authors.'
    }
  )
})
