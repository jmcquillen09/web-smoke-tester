import assert from 'node:assert/strict'
import test from 'node:test'

import { takeBrowserArgument } from '../e2e/takeBrowserArgument.ts'

void test('without --browser the run uses chrome and keeps every argument', () => {
  assert.deepEqual(takeBrowserArgument(['qa', 'e2e/smoke.spec.ts']), {
    choice: 'chrome',
    rest: ['qa', 'e2e/smoke.spec.ts']
  })
})

void test('--browser=<choice> is taken out of the arguments Playwright receives', () => {
  assert.deepEqual(takeBrowserArgument(['local', '--browser=safari', '--headed']), {
    choice: 'safari',
    rest: ['local', '--headed']
  })
})

void test('--browser <choice> takes the flag and its value, leaving the rest in order', () => {
  assert.deepEqual(
    takeBrowserArgument(['--browser', 'all', 'development', '--grep', '@negative']),
    {
      choice: 'all',
      rest: ['development', '--grep', '@negative']
    }
  )
})

void test('--browser with no value yields an empty choice for the wrapper to reject', () => {
  assert.deepEqual(takeBrowserArgument(['local', '--browser']), { choice: '', rest: ['local'] })
})
