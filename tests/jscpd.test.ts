import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import packageJson from '../package.json' with { type: 'json' }

const repoRoot = path.join(import.meta.dirname, '..')
const jscpd = createRequire(import.meta.url).resolve('jscpd/run-jscpd.js')
// The check exactly as `npm run duplication` runs it, without the command's own name.
const duplicationArguments = packageJson.scripts.duplication.split(' ').slice(1)

const TYPESCRIPT_BLOCK = `export const describePorts = (ports: readonly number[]): string[] => {
  const descriptions: string[] = []
  for (const port of ports) {
    const isPrivileged = port < 1024
    const kind = isPrivileged ? 'privileged' : 'unprivileged'
    descriptions.push(\`port \${String(port)} is \${kind} and \${port % 2 === 0 ? 'even' : 'odd'}\`)
  }
  return descriptions
}
`
const YAML_BLOCK = `steps:
  - uses: actions/checkout@v1
  - uses: actions/setup-node@v1
    with:
      node-version-file: .nvmrc
      cache: npm
      registry-url: https://npm.pkg.github.com
  - run: npm ci
  - run: npm run typecheck
  - run: npm run lint
  - run: npm test
`

// An identity to commit with, and files kept as written, whatever the machine's own git settings.
const GIT_SETTINGS = [
  'user.name=test',
  'user.email=test@example.invalid',
  'core.autocrlf=false'
].flatMap((setting) => ['-c', setting])

// A repository whose origin/main holds `files` and this repo's jscpd settings; returns its folder.
const createRepositoryWithMain = (files: Readonly<Record<string, string>>): string => {
  const folder = mkdtempSync(path.join(tmpdir(), 'duplication-check-'))
  const git = (...args: readonly string[]): void => {
    execFileSync('git', [...GIT_SETTINGS, ...args], {
      cwd: folder
    })
  }
  copyFileSync(path.join(repoRoot, '.jscpd.json'), path.join(folder, '.jscpd.json'))
  for (const [name, content] of Object.entries(files))
    writeFileSync(path.join(folder, name), content)
  git('init', '--quiet')
  git('add', '.')
  git('commit', '--quiet', '--message', 'main')
  git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  return folder
}

const runDuplicationCheck = (
  folder: string
): { readonly code: number; readonly output: string } => {
  const run = spawnSync(process.execPath, [jscpd, ...duplicationArguments, '--no-colors'], {
    cwd: folder,
    encoding: 'utf8'
  })
  return { code: run.status ?? 1, output: run.stdout + run.stderr }
}

void test('code that copies nothing passes the duplication check', () => {
  const folder = createRepositoryWithMain({ 'ports.ts': TYPESCRIPT_BLOCK })

  const run = runDuplicationCheck(folder)

  assert.equal(run.code, 0, run.output)
})

void test('a TypeScript block copied since main fails the duplication check, naming both files', () => {
  const folder = createRepositoryWithMain({ 'ports.ts': TYPESCRIPT_BLOCK })
  writeFileSync(path.join(folder, 'copiedPorts.ts'), TYPESCRIPT_BLOCK)

  const run = runDuplicationCheck(folder)

  assert.equal(run.code, 1, run.output)
  assert.match(run.output, /ports\.ts/)
  assert.match(run.output, /copiedPorts\.ts/)
})

void test('a YAML block copied since main fails the duplication check', () => {
  const folder = createRepositoryWithMain({ 'first.yml': YAML_BLOCK })
  writeFileSync(path.join(folder, 'second.yml'), YAML_BLOCK)

  const run = runDuplicationCheck(folder)

  assert.equal(run.code, 1, run.output)
  assert.match(run.output, /second\.yml/)
})
