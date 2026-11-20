import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { ESLint } from 'eslint'

const repoRoot = path.join(import.meta.dirname, '..')

// The rules read types, so the linted text takes the path of a file tsconfig.json includes.
const lintedFilePath = path.join(repoRoot, 'tests/eslintConfig.test.ts')

const findReportedRuleIds = async (sourceText: string): Promise<readonly string[]> => {
  const eslint = new ESLint({ cwd: repoRoot })
  const results = await eslint.lintText(sourceText, { filePath: lintedFilePath })

  return results.flatMap((result) => result.messages.map((message) => String(message.ruleId)))
}

void test('a for-in loop is reported by the v8 rules', async () => {
  const reportedRuleIds = await findReportedRuleIds(
    'export const keys: string[] = []\nfor (const key in { a: 1 }) keys.push(key)\n'
  )

  assert.deepEqual(reportedRuleIds, ['@studnicky/v8/for-in-loops'])
})

void test('a double assertion is reported by the type rules', async () => {
  const reportedRuleIds = await findReportedRuleIds(
    'export const port = 8080 as unknown as string\n'
  )

  assert.deepEqual(reportedRuleIds, ['@studnicky/no-double-assertion'])
})

void test('code that breaks no rule is reported by none', async () => {
  assert.deepEqual(await findReportedRuleIds('export const port = 8080\n'), [])
})
