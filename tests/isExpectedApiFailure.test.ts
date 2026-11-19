import assert from 'node:assert/strict'
import test from 'node:test'

import { isExpectedApiFailure } from '../e2e/isExpectedApiFailure.ts'

const SETTINGS = {
  expectedApiFailures: [
    { path: '/authors', check: 'contentType' as const },
    { path: '/stats', check: 'status' as const }
  ]
}

void test('a check the target expects to fail on an operation is an expected failure', () => {
  assert.equal(isExpectedApiFailure(SETTINGS, { path: '/authors' }, 'contentType'), true)
  assert.equal(isExpectedApiFailure(SETTINGS, { path: '/stats' }, 'status'), true)
})

void test('the same operation’s other check, and every other operation, is expected to pass', () => {
  assert.equal(isExpectedApiFailure(SETTINGS, { path: '/authors' }, 'status'), false)
  assert.equal(isExpectedApiFailure(SETTINGS, { path: '/books' }, 'status'), false)
  assert.equal(
    isExpectedApiFailure({ expectedApiFailures: [] }, { path: '/stats' }, 'status'),
    false
  )
})
