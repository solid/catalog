import { DataFactory, Store } from 'n3'
import { dereferenceToStore } from 'rdf-dereference-store'
import { queryDataset, prefixes, ex, schema } from '../util.ts'
import type { NamedNode } from '@rdfjs/types'

export async function aggregateWikidata(dataset: Store): Promise<Store> {
  return aggregateProgrammingLanguages(dataset)
}

async function getName(store: Store, language: NamedNode, tag: string): Promise<string | undefined> {
  const query = `
      SELECT ?s ?name
      WHERE {
        <${language.value}> <${schema.name}> ?name
        FILTER ( LANG(?name) = "${tag}" )
      }`

  let bindings = await queryDataset(store, query)
  return bindings[0]?.get('name')?.value
}

export async function aggregateProgrammingLanguages(dataset: Store): Promise<Store> {
  const instanceOf = `${prefixes.wdt}P31`
  const ProgrammingLanguage = `${prefixes.wd}Q9143`
  const langQuery = `
    SELECT ?s ?name
    WHERE {
      ?s <${instanceOf}> <${ProgrammingLanguage}> .
      OPTIONAL { ?s <${ex.name}> ?name . }
    }`
  const lbindings = await queryDataset(dataset, langQuery)
  const withoutNames = lbindings.filter(b => !b.get('name')).map(b => b.get('s') as NamedNode)
  console.info(`Fetching names for programming langages: ${withoutNames.length}`)
  for (const language of withoutNames) {
    const { store } = await dereferenceToStore(language.value.replace('http', 'https'))
    let name = await getName(store, language, 'en')
    if (!name) name = await getName(store, language, 'mul')
    if (!name) {
      console.warn(`Couldn't find name for ${language.value}`)
      continue
    }
    const quad = DataFactory.quad(language, ex.terms.name, DataFactory.literal(name))
    dataset.add(quad)
  }
  return dataset
}

