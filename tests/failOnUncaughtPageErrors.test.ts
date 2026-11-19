import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import type { TestInfo } from '@playwright/test'

import { failOnUncaughtPageErrors } from '../e2e/fixtures/failOnUncaughtPageErrors.ts'

type WebErrorListener = Parameters<Parameters<typeof failOnUncaughtPageErrors>[0]['on']>[1]
type ErrorPage = ReturnType<Parameters<WebErrorListener>[0]['page']>

// A browser context that hands its `weberror` listener back, so a test can raise errors on it.
const createContext = () => {
  const listeners: WebErrorListener[] = []
  return {
    context: {
      on: (_event: 'weberror', listener: WebErrorListener) => void listeners.push(listener)
    },
    raise: (error: Error, page: ErrorPage) => {
      for (const listener of listeners) listener({ error: () => error, page: () => page })
    }
  }
}

interface Attachment {
  readonly name: string
  readonly body: string | Buffer | undefined
  readonly path: string | undefined
}

// A test's report: what was attached, and a scratch folder standing in for its output folder.
const captureAttachments = () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'uncaught-errors-'))
  const attachments: Attachment[] = []
  const attach: TestInfo['attach'] = async (name, options) => {
    attachments.push({ name, body: options?.body, path: options?.path })
  }
  const outputPath: TestInfo['outputPath'] = (...segments) => path.join(folder, ...segments)
  return { attachments, attach, outputPath }
}

const namesOf = (attachments: readonly Attachment[]): string[] =>
  attachments.map((attachment) => attachment.name)

const errorWithStack = (message: string, stack: string): Error => {
  const error = new Error(message)
  error.stack = stack
  return error
}

const pageAt = (
  url: string,
  screenshot = () => Promise.resolve(Buffer.from('png'))
): ErrorPage => ({
  url: () => url,
  screenshot
})

void test('a test whose pages raise nothing passes the check and attaches nothing', async () => {
  const { context } = createContext()
  const report = captureAttachments()

  await failOnUncaughtPageErrors(context, report)()

  assert.deepEqual(report.attachments, [])
})

void test('each distinct uncaught error fails the check with its page and stack, and is attached', async () => {
  const { context, raise } = createContext()
  const report = captureAttachments()
  const check = failOnUncaughtPageErrors(context, report)

  raise(
    errorWithStack('cart is undefined', 'Error: cart is undefined\n    at render (app.js:10:3)'),
    pageAt('https://site.example/cart')
  )
  raise(errorWithStack('second', 'Error: second'), pageAt('https://site.example/'))

  await assert.rejects(check, {
    name: 'E2eUncaughtPageError',
    message:
      /^The site left 2 error\(s\) unhandled \(2 distinct\):\n\nhttps:\/\/site\.example\/cart\nError: cart is undefined\n {4}at render/
  })
  assert.deepEqual(namesOf(report.attachments), [
    'uncaught-page-error-1.txt',
    'uncaught-page-error-1.png',
    'uncaught-page-error-2.txt',
    'uncaught-page-error-2.png'
  ])
})

void test('a screenshot is attached as a file in the test’s output folder, never as a body', async () => {
  const { context, raise } = createContext()
  const report = captureAttachments()
  const check = failOnUncaughtPageErrors(context, report)

  raise(errorWithStack('boom', 'Error: boom'), pageAt('https://site.example/'))

  await assert.rejects(check)
  const screenshot = report.attachments.find((attachment) => attachment.name.endsWith('.png'))
  assert.equal(screenshot?.body, undefined)
  assert.equal(readFileSync(screenshot?.path ?? '', 'utf8'), 'png')
})

void test('the same error raised again on the same page is counted, not listed again', async () => {
  const { context, raise } = createContext()
  const report = captureAttachments()
  const check = failOnUncaughtPageErrors(context, report)
  const page = pageAt('https://site.example/')

  for (let repeat = 0; repeat < 34; repeat += 1) {
    raise(errorWithStack('hydration failed', 'Error: hydration failed'), page)
  }
  raise(errorWithStack('other', 'Error: other'), page)

  await assert.rejects(check, {
    message:
      'The site left 35 error(s) unhandled (2 distinct):\n\n34 times: https://site.example/\nError: hydration failed\n\nhttps://site.example/\nError: other'
  })
  assert.deepEqual(namesOf(report.attachments), [
    'uncaught-page-error-1.txt',
    'uncaught-page-error-1.png',
    'uncaught-page-error-2.txt',
    'uncaught-page-error-2.png'
  ])
})

void test('only the first three distinct errors are screenshotted', async () => {
  const { context, raise } = createContext()
  const report = captureAttachments()
  const check = failOnUncaughtPageErrors(context, report)
  let screenshots = 0
  const page = pageAt('https://site.example/', () => {
    screenshots += 1
    return Promise.resolve(Buffer.from('png'))
  })

  for (const name of ['a', 'b', 'c', 'd', 'e']) raise(errorWithStack(name, `Error: ${name}`), page)

  await assert.rejects(check, /5 error\(s\) unhandled \(5 distinct\)/)
  assert.equal(screenshots, 3)
  assert.equal(namesOf(report.attachments).filter((name) => name.endsWith('.txt')).length, 5)
})

void test('an error with no stack is described by its name and message', async () => {
  const { context, raise } = createContext()
  const report = captureAttachments()
  const check = failOnUncaughtPageErrors(context, report)
  const error = new TypeError('x is not a function')
  delete error.stack

  raise(error, pageAt('https://site.example/'))

  await assert.rejects(check, /https:\/\/site\.example\/\nTypeError: x is not a function$/)
})

void test('an error from a closed or unknown page is still reported, without a screenshot', async () => {
  const { context, raise } = createContext()
  const report = captureAttachments()
  const check = failOnUncaughtPageErrors(context, report)

  raise(
    errorWithStack('late', 'Error: late'),
    pageAt('https://site.example/closed', () => Promise.reject(new Error('closed')))
  )
  raise(errorWithStack('orphan', 'Error: orphan'), null)

  await assert.rejects(check, /2 error\(s\) unhandled[\s\S]*unknown page\nError: orphan/)
  assert.deepEqual(namesOf(report.attachments), [
    'uncaught-page-error-1.txt',
    'uncaught-page-error-2.txt'
  ])
})
