import { devices, type PlaywrightTestOptions, type PlaywrightWorkerOptions } from '@playwright/test'
import { E2eConfigurationError } from '../errors/E2eConfigurationError.ts'

type DeviceOptions = Pick<
  PlaywrightTestOptions,
  'viewport' | 'userAgent' | 'deviceScaleFactor' | 'hasTouch'
>

interface HandheldDeviceOptions extends DeviceOptions {
  /** Whether this browser can take on the device's mobile viewport behavior. */
  readonly supportsMobileViewport: (browserName: PlaywrightWorkerOptions['browserName']) => boolean
}

// What a test's browser takes on to be seen as `device` at the given screen size: the device's user
// agent, touch input and pixel density. The engine stays the project's own, so every browser a run
// covers gets the page a site serves handheld devices. Firefox has no mobile viewport mode.
export const handheldDeviceOptions = (
  device: string,
  viewport: { readonly width: number; readonly height: number }
): HandheldDeviceOptions => {
  const descriptor = devices[device]
  const isKnownDevice = descriptor !== undefined
  if (!isKnownDevice) {
    throw new E2eConfigurationError(`Playwright has no device named "${device}".`)
  }
  return {
    viewport: { width: viewport.width, height: viewport.height },
    userAgent: descriptor.userAgent,
    deviceScaleFactor: descriptor.deviceScaleFactor,
    hasTouch: descriptor.hasTouch,
    supportsMobileViewport: (browserName) => browserName !== 'firefox'
  }
}
