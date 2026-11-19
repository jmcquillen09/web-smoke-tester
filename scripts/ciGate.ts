#!/usr/bin/env node
// The `ci-gate` job of .github/workflows/ci.yml: passes only when every job it waits on succeeded.
// CI_JOBS holds those jobs as GitHub's `toJSON(needs)` writes them.

import { z } from 'zod'
import { findUnsuccessfulCiJobs } from '../support/findUnsuccessfulCiJobs.ts'

const COMMAND = 'ci-gate'
const CI_JOBS_VARIABLE = 'CI_JOBS'
const CiJobsSchema = z.record(z.string(), z.object({ result: z.string() }))

const readCiJobs = (): z.infer<typeof CiJobsSchema> => {
  try {
    return CiJobsSchema.parse(JSON.parse(process.env[CI_JOBS_VARIABLE] ?? ''))
  } catch {
    console.error(
      `${COMMAND}: ${CI_JOBS_VARIABLE} must be the JSON of the jobs this gate waits on.`
    )
    process.exit(1)
  }
}

const jobs = readCiJobs()
const hasJobs = Object.keys(jobs).length > 0
if (!hasJobs) {
  console.error(`${COMMAND}: ${CI_JOBS_VARIABLE} names no job, so nothing vouches for this change.`)
  process.exit(1)
}

const unsuccessful = findUnsuccessfulCiJobs(jobs)
const hasEveryJobSucceeded = unsuccessful.length === 0
if (!hasEveryJobSucceeded) {
  console.error(`${COMMAND}: not every job succeeded (${unsuccessful.join(', ')}).`)
  process.exit(1)
}
console.log(`${COMMAND}: every job succeeded (${Object.keys(jobs).join(', ')}).`)
