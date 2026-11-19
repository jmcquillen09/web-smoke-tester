import { activeApiOperations } from '../activeApiOperations.ts'
import { apiTest } from '../fixtures/apiTest.ts'
import { CheckApiBodyStage } from '../stages/CheckApiBodyStage.ts'
import { runIsolated } from '../stages/runIsolated.ts'

// An operation whose document declares no body schema has nothing to hold its answer against.
const operationsWithSchemas = activeApiOperations().filter(
  (operation) => operation.bodySchemas.length > 0
)

for (const operation of operationsWithSchemas) {
  apiTest(
    `GET ${operation.path} answers with a body its document’s schema allows`,
    async ({ stageRuntime }) => {
      await runIsolated(new CheckApiBodyStage(stageRuntime, operation))
    }
  )
}
