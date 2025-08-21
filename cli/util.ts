import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { arrayifyStream } from 'arrayify-stream'
import { rdfParser } from 'rdf-parse'
import { createVocabulary } from 'rdf-vocabulary'
import { DataFactory, type Quad, type NamedNode, type Literal } from 'n3'
import type { Bindings } from '@rdfjs/types'
import { QueryEngine } from '@comunica/query-sparql-rdfjs'
import { Store } from 'n3'
import { write } from '@jeswr/pretty-turtle'

const prefixes = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  con: 'https://solidproject.solidcommunity.net/catalog/taxonomy#',
  cdata: 'https://solidproject.solidcommunity.net/catalog/data#',
  ex: 'http://example.org#',
}

export async function formatData(filePath: string): Promise<void> {
  const fromStream = await readQuadStream(filePath)
  const fromQuads = await arrayifyStream(fromStream)
  const outString = await write(fromQuads, { prefixes, ordered: true })
  fs.writeFileSync(filePath, outString)
}

export async function loadData(filePath: string): Promise<Store> {
  const fromStream = await readQuadStream(filePath)
  return new Store(await arrayifyStream(fromStream))
}

export async function saveData(dataset: Store, filePath: string): Promise<void> {
  const outString = await write([...dataset], { prefixes, ordered: true })
  fs.writeFileSync(filePath, outString)
}

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

