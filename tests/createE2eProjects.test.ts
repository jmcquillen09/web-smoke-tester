import assert from 'node:assert/strict'
import test from 'node:test'

import { createE2eProjects } from '../e2e/createE2eProjects.ts'

const describeProjects = (browsers: Parameters<typeof createE2eProjects>[0]) =>
  createE2eProjects(browsers).map((project) => ({
    name: project.name,
    dependencies: project.dependencies ?? [],
    browserName: project.use?.defaultBrowserType,
    channel: project.use?.channel
  }))

void test('one browser gets an isolated project and a workflows project gated on it', () => {
  assert.deepEqual(describeProjects(['chrome']), [
    { name: 'isolated-chrome', dependencies: [], browserName: 'chromium', channel: undefined },
    {
      name: 'workflows-chrome',
      dependencies: ['isolated-chrome'],
      browserName: 'chromium',
      channel: undefined
    }
  ])
})

void test('each browser gates its workflows on its own isolated tests only', () => {
  const workflows = describeProjects(['chrome', 'firefox', 'safari', 'edge']).filter(
    (project) => project.dependencies.length > 0
  )

  assert.deepEqual(
    workflows.map(({ name, dependencies }) => ({ name, dependencies })),
    [
      { name: 'workflows-chrome', dependencies: ['isolated-chrome'] },
      { name: 'workflows-firefox', dependencies: ['isolated-firefox'] },
      { name: 'workflows-safari', dependencies: ['isolated-safari'] },
      { name: 'workflows-edge', dependencies: ['isolated-edge'] }
    ]
  )
})

void test('safari runs WebKit and edge runs the installed Microsoft Edge', () => {
  const [safari] = describeProjects(['safari'])
  const [edge] = describeProjects(['edge'])

  assert.equal(safari?.browserName, 'webkit')
  assert.deepEqual(
    { browserName: edge?.browserName, channel: edge?.channel },
    {
      browserName: 'chromium',
      channel: 'msedge'
    }
  )
})

void test('only workflows projects run the specs under e2e/workflows/, and neither runs e2e/api/', () => {
  const [isolated, workflows] = createE2eProjects(['firefox'])

  assert.deepEqual(
    { isolatedIgnores: isolated?.testIgnore, workflowsMatches: workflows?.testMatch },
    { isolatedIgnores: ['workflows/**', 'api/**'], workflowsMatches: 'workflows/**/*.spec.ts' }
  )
})

void test('a target’s own window size replaces the browser preset’s in every project', () => {
  const projects = createE2eProjects(['chrome', 'firefox'], {
    viewport: { width: 1920, height: 1080 }
  })

  assert.deepEqual(
    projects.map((project) => project.use?.viewport),
    Array.from({ length: 4 }, () => ({ width: 1920, height: 1080 }))
  )
})

void test('without a target window size each browser keeps its preset’s', () => {
  const [chrome] = createE2eProjects(['chrome'])

  assert.deepEqual(chrome?.use?.viewport, { width: 1280, height: 720 })
})
