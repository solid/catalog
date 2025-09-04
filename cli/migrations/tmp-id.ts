import crypto from 'node:crypto'
import type { NamedNode } from '@rdfjs/types'
import { DataFactory, type Store } from 'n3'
import { prefixes, queryDatasetConstruct, changeObject, changeSubject } from '../util.ts'

function buildQuery(position: 's' | 'o'): string {
  return `
    CONSTRUCT {
      ?s ?p ?o .
    }
    WHERE {
      ?s ?p ?o .
      FILTER regex(STR(?${position}), "^${prefixes.cdata}")
    }`
}

const idMap = new Map<string, NamedNode>()

function getId(tmpId: NamedNode): NamedNode {
  const existing = idMap.get(tmpId.value)
  if (existing) return existing
  const id = DataFactory.namedNode(`urn:uuid:${crypto.randomUUID()}`)
  idMap.set(tmpId.value, id)
  return id
}

export async function migrateTmpId(dataset: Store): Promise<Store> {
  for (const position of ['s', 'o'] as const) {
    const quads = await queryDatasetConstruct(dataset, buildQuery(position))
    console.info(`statements with a temporary id (?${position})`, quads.length)
    for (const quad of quads) {
      dataset.delete(quad)
      const updated = position === 's'
        ? changeSubject(quad, getId(quad.subject as NamedNode))
        : changeObject(quad, getId(quad.object as NamedNode))
      dataset.add(updated)
    }
  }

  return dataset
}
