import { activeApiOperations } from '../activeApiOperations.ts'
import { apiTest } from '../fixtures/apiTest.ts'
import { CheckApiAuthStage } from '../stages/CheckApiAuthStage.ts'
import { runIsolated } from '../stages/runIsolated.ts'

// Only an operation the document marks as secured has a refusal to expect.
const securedOperations = activeApiOperations().filter((operation) => operation.secured)

for (const operation of securedOperations) {
  apiTest(
    `GET ${operation.path} refuses a request without credentials`,
    async ({ stageRuntime }) => {
      await runIsolated(new CheckApiAuthStage(stageRuntime, operation))
    }
  )
}
