import { E2eBrowser } from './E2eBrowser.ts'

const BROWSER_FLAG = '--browser'

interface BrowserArgument {
  /** The `--browser` value as given, or chrome when the flag is absent. */
  readonly choice: string
  /** Every other argument, in order. */
  readonly rest: readonly string[]
}

// Takes `--browser=<choice>` or `--browser <choice>` out of the wrapper's arguments. Playwright's own
// --browser takes engine names (chromium, webkit) rather than ours, so it must never see the flag.
export const takeBrowserArgument = (args: readonly string[]): BrowserArgument => {
  const flagIndex = args.findIndex(
    (arg) => arg === BROWSER_FLAG || arg.startsWith(`${BROWSER_FLAG}=`)
  )
  const hasBrowserFlag = flagIndex !== -1
  if (!hasBrowserFlag) return { choice: E2eBrowser.CHROME, rest: args }

  const flag = args[flagIndex] ?? ''
  const isValueSeparate = flag === BROWSER_FLAG
  const choice = isValueSeparate ? (args[flagIndex + 1] ?? '') : flag.slice(BROWSER_FLAG.length + 1)
  const takenCount = isValueSeparate ? 2 : 1
  return { choice, rest: [...args.slice(0, flagIndex), ...args.slice(flagIndex + takenCount)] }
}
