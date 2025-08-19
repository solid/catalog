import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rdfParser } from 'rdf-parse'

export function getPath(from: string, to: string): string {
  const __filename = fileURLToPath(from)
  const __dirname = dirname(__filename)
  return join(__dirname, to)
}

export async function readQuadStream(filePath: string, contentType = 'text/turtle') {
  const textStream = fs.createReadStream(filePath, { encoding: 'utf8' })
  return rdfParser.parse(textStream, {
    contentType,
  })

}
