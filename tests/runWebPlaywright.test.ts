import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import test from 'node:test'

import { demoSite } from '../demo/demoSite.ts'
import { startDemoServer } from '../demo/startDemoServer.ts'
import { stopDemoServer } from '../demo/stopDemoServer.ts'
import { TARGETS_FILE_VARIABLE } from '../e2e/constants.ts'
import { writeTargetsFile } from './fixtures/writeTargetsFile.ts'

const HOST = '127.0.0.1'
const RUNNER = path.join(import.meta.dirname, '..', 'scripts', 'runE2ePlaywright.ts')

const targetsFileFor = (port: number): string =>
  writeTargetsFile(
    JSON.stringify({
      defaultTarget: 'demo',
      targets: { demo: { baseUrl: `http://${HOST}:${String(port)}`, servesDemoSite: true } }
    })
  )

// Runs the site runner with `--list`, which has Playwright name the tests without opening a browser,
// and resolves with its exit code and everything it printed.
const listSiteTests = (targetsFile: string): Promise<{ code: number; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RUNNER, 'demo', '--list'], {
      env: { ...process.env, [TARGETS_FILE_VARIABLE]: targetsFile }
    })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output })
    })
  })

void test('a run against a target that serves the demo site starts it, crawls it and shuts it down', async () => {
  const free = await startDemoServer(demoSite, 0, HOST)
  const { port } = free.address() as AddressInfo
  await stopDemoServer(demoSite, free)

  const run = await listSiteTests(targetsFileFor(port))

  assert.equal(run.code, 0, run.output)
  const started = run.output.indexOf('the demo site is running at')
  const crawled = run.output.indexOf('testing 3 page(s)')
  const stopped = run.output.indexOf('the demo site has shut down')
  assert.equal(started >= 0 && started < crawled && crawled < stopped, true, run.output)
  assert.match(run.output, /\/, \/books, \/about/)
  const next = await startDemoServer(demoSite, port, HOST)
  await stopDemoServer(demoSite, next)
})

void test('a run whose port is taken stops with the reason and leaves the port’s holder running', async () => {
  const holder = await startDemoServer(demoSite, 0, HOST)
  const { port } = holder.address() as AddressInfo
  try {
    const run = await listSiteTests(targetsFileFor(port))

    assert.equal(run.code, 1)
    assert.match(run.output, /The demo site could not start on/)
    assert.doesNotMatch(run.output, /the demo site is running at/)
    assert.equal(holder.listening, true)
  } finally {
    await stopDemoServer(demoSite, holder)
  }
})
