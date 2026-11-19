import { ALL_E2E_BROWSERS, E2E_BROWSER_CHOICES, E2E_BROWSER_LIST_SEPARATOR } from './constants.ts'
import { type E2eBrowser, E2eBrowserValues } from './E2eBrowser.ts'
import { E2eConfigurationError } from './errors/E2eConfigurationError.ts'

const isE2eBrowser = (value: string): value is E2eBrowser =>
  E2eBrowserValues.some((browser) => browser === value)

const toE2eBrowser = (name: string): E2eBrowser => {
  if (!isE2eBrowser(name)) {
    throw new E2eConfigurationError(
      `Unknown e2e browser "${name}". Expected one of: ${E2E_BROWSER_CHOICES.join(', ')}, or a comma-separated list of browsers.`
    )
  }
  return name
}

// The one place a `--browser` choice becomes the browsers a run covers: the one named, a
// comma-separated list of them in the order given (`chrome,firefox,safari`), or every browser for
// `all`.
export const resolveE2eBrowsers = (choice: string): readonly E2eBrowser[] => {
  const isAllBrowsers = choice === ALL_E2E_BROWSERS
  if (isAllBrowsers) return E2eBrowserValues

  const names = choice.split(E2E_BROWSER_LIST_SEPARATOR)
  const hasAllInList = names.length > 1 && names.includes(ALL_E2E_BROWSERS)
  if (hasAllInList) {
    throw new E2eConfigurationError(
      `"${ALL_E2E_BROWSERS}" cannot be part of a browser list ("${choice}"); use it on its own.`
    )
  }
  const browsers = names.map(toE2eBrowser)
  const hasDuplicate = new Set(browsers).size !== browsers.length
  if (hasDuplicate) {
    throw new E2eConfigurationError(`The browser list "${choice}" names a browser more than once.`)
  }
  return browsers
}
