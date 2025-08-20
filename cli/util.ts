import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rdfParser } from 'rdf-parse'
import { createVocabulary } from 'rdf-vocabulary'
import { DataFactory, type Quad, type NamedNode, type Literal } from 'n3'

export const ex = createVocabulary('http://example.org#', 'webid')

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

export function changeSubject(quad: Quad, subject: NamedNode): Quad {
  return DataFactory.quad(subject, quad.predicate, quad.object)
}

export function changeObject(quad: Quad, object: NamedNode | Literal): Quad {
  return DataFactory.quad(quad.subject, quad.predicate, object)
}
