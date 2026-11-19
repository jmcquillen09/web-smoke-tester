const CONFIGURATION_EXIT_CODE = 2

// Runs a runner's own input checks. A failed one prints its reason under the command's name and
// ends the process as a refused run, before anything is requested from a site.
export const stopOnConfigurationError = <T>(command: string, resolve: () => T): T => {
  try {
    return resolve()
  } catch (error) {
    console.error(`${command}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(CONFIGURATION_EXIT_CODE)
  }
}
