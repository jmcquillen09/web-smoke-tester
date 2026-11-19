import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { targetsFilePath } from '../e2e/targetsFilePath.ts'

void test('the targets file is this repo’s own, whatever the working directory', () => {
  assert.equal(targetsFilePath({}), path.join(import.meta.dirname, '..', 'targets.json'))
})

void test('E2E_TARGETS_FILE points a run at another file', () => {
  assert.equal(
    targetsFilePath({ E2E_TARGETS_FILE: path.join('other', 'sites.json') }),
    path.resolve('other', 'sites.json')
  )
})

void test('an empty E2E_TARGETS_FILE is no override', () => {
  assert.equal(
    targetsFilePath({ E2E_TARGETS_FILE: '' }),
    path.join(import.meta.dirname, '..', 'targets.json')
  )
})
