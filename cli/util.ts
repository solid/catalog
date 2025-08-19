import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export function getPath(from: string, to: string): string {
  const __filename = fileURLToPath(from)
  const __dirname = dirname(__filename)
  return join(__dirname, to)
}
