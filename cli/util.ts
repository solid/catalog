import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { arrayifyStream } from 'arrayify-stream'
import { rdfParser } from 'rdf-parse'
import { createVocabulary } from 'rdf-vocabulary'
import { DataFactory, type Quad, type NamedNode, type Literal } from 'n3'
import type { Bindings } from '@rdfjs/types'
import { QueryEngine } from '@comunica/query-sparql-rdfjs'
import type { Store } from 'n3'

export const ex = createVocabulary('http://example.org#', 'webid', 'siloId', 'member', 'siloUsername', 'Person', 'Organization')

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

export async function queryDataset(dataset: Store, query: string): Promise<Bindings[]> {
  const queryEngine = new QueryEngine()
  const bindingsStream = await queryEngine.queryBindings(query, {
    sources: [dataset],
  })
  return arrayifyStream<Bindings>(bindingsStream)
}

export type Silo = {
  prefix: string
}

export const silos: { [key: string]: Silo } = {
  github: {
    prefix: 'github:'
  },
  w3c: {
    prefix: 'w3c:'
  }

}

