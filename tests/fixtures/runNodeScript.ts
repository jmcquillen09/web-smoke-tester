import { spawn } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = path.join(import.meta.dirname, '..', '..')

// Runs Node on `args` from the repo root, with `env` on top of this process's own, and resolves
// with the exit code and everything the run printed.
export const runNodeScript = (
  args: readonly string[],
  env: Readonly<Record<string, string>>
): Promise<{ readonly code: number; readonly output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: REPO_ROOT, env: { ...process.env, ...env } })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output })
    })
  })
