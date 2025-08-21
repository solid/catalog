import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { arrayifyStream } from 'arrayify-stream'
import { rdfParser } from 'rdf-parse'
import { createVocabulary } from 'rdf-vocabulary'
import { DataFactory } from 'n3'
import type { Bindings, NamedNode, Literal, Quad } from '@rdfjs/types'
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

export type Entity = { id: NamedNode, value: string }

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

export function entitiesDifference(minuend: Entity[], subtrahend: Entity[]): Entity[] {
  return minuend.filter(a => !subtrahend.find(b => a.id.equals(b.id)))
}

export async function selectSiloEntities(dataset: Store, predicate: string, silo: Silo, extraWhere = ''): Promise<Entity[]> {
  const query = `
    SELECT ?s ?captured
    WHERE {
      ?s <${predicate}> ?value .
      ${extraWhere}
      FILTER regex(?value, "^${silo.prefix}")
      BIND(REPLACE(?value, "^${silo.prefix}", "") AS ?captured)
    }`
  const bindings = await queryDataset(dataset, query)
  return bindings.map(b => ({ id: b.get('s') as NamedNode, value: b.get('captured')!.value }))
}

