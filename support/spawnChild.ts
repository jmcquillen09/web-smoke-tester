import { spawn, type SpawnOptions } from 'node:child_process'
import type { ChildOutcome } from './ChildOutcome.ts'

// The signals that ask this process to stop; the child is asked the same way.
const FORWARDED_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP']

// Runs a command to its end and reports how it ended. A stop signal sent to this process goes on to
// the child, and this process waits for it, so nothing the child started outlives the command.
export const spawnChild = async (
  command: string,
  args: readonly string[],
  options: SpawnOptions
): Promise<ChildOutcome> => {
  const child = spawn(command, args, options)
  const forwarders = FORWARDED_SIGNALS.map((signal) => {
    const forward = (): void => {
      child.kill(signal)
    }
    process.on(signal, forward)
    return { signal, forward }
  })
  try {
    return await new Promise<ChildOutcome>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', (code, signal) => {
        const wasSignalled = signal !== null
        resolve(wasSignalled ? { kind: 'signalled', signal } : { kind: 'exited', code: code ?? 0 })
      })
    })
  } finally {
    for (const { signal, forward } of forwarders) process.off(signal, forward)
  }
}
