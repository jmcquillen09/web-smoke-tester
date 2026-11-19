import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Writes `content` as a targets file in a new scratch folder and returns the file's path.
export const writeTargetsFile = (content: string): string => {
  const folder = mkdtempSync(path.join(tmpdir(), 'targets-file-'))
  const file = path.join(folder, 'targets.json')
  writeFileSync(file, content)
  return file
}
