import { activeE2ePages } from './activeE2ePages.ts'
import { activeE2eTarget } from './activeE2eTarget.ts'

// The pages of the active target every page spec writes one test for.
export const sitePages = (): readonly string[] => activeE2ePages(activeE2eTarget())
