// The jobs a CI gate waits on that did not succeed, each as `name: result`, in the order given. A
// failed, cancelled or skipped job each count: only `success` lets a gate pass.
export const findUnsuccessfulCiJobs = (
  jobs: Readonly<Record<string, { readonly result: string }>>
): readonly string[] =>
  Object.entries(jobs)
    .filter(([, job]) => job.result !== 'success')
    .map(([name, job]) => `${name}: ${job.result}`)
