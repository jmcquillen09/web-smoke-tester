import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { readE2eTargets } from '../e2e/readE2eTargets.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

void test('reads the default target and every target the file holds', () => {
  const file = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'staging',
      targets: {
        staging: { baseUrl: 'https://staging.example.com', paths: ['/', '/pricing'] },
        production: { baseUrl: 'https://www.example.com', crawlLimit: 0, disabled: 'not yet' }
      }
    })
  )

  assert.deepEqual(readE2eTargets(file), {
    defaultTarget: 'staging',
    targets: {
      staging: { baseUrl: 'https://staging.example.com', paths: ['/', '/pricing'] },
      production: { baseUrl: 'https://www.example.com', crawlLimit: 0, disabled: 'not yet' }
    }
  })
})

void test('a missing file is a configuration error that names the path', () => {
  const file = path.join(tmpdir(), 'no-such-folder', 'targets.json')

  assert.throws(
    () => readE2eTargets(file),
    (error: unknown) =>
      error instanceof Error &&
      error.name === 'E2eConfigurationError' &&
      error.message.startsWith(`No targets file at ${file}.`)
  )
})

void test('a file that is not JSON is a configuration error, not a syntax error', () => {
  const file = writeTargetsFile('{ "defaultTarget": ')

  assert.throws(() => readE2eTargets(file), {
    name: 'E2eConfigurationError',
    message: /is not valid JSON/
  })
})

void test('a misspelled setting is refused and named, so it is never silently ignored', () => {
  const file = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'staging',
      targets: { staging: { baseUrl: 'https://staging.example.com', crawlLimt: 3 } }
    })
  )

  assert.throws(() => readE2eTargets(file), {
    name: 'E2eConfigurationError',
    message: /targets\.staging.*crawlLimt/
  })
})

void test('a target without a base URL is refused and named', () => {
  const file = writeTargetsFile(
    JSON.stringify({ defaultTarget: 'staging', targets: { staging: {} } })
  )

  assert.throws(() => readE2eTargets(file), {
    name: 'E2eConfigurationError',
    message: /targets\.staging\.baseUrl/
  })
})

void test('a window size must be whole, positive pixels', () => {
  const file = writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'staging',
      targets: {
        staging: { baseUrl: 'https://staging.example.com', viewport: { width: 0, height: 1080 } }
      }
    })
  )

  assert.throws(() => readE2eTargets(file), {
    name: 'E2eConfigurationError',
    message: /targets\.staging\.viewport\.width/
  })
})
