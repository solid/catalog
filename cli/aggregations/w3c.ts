import w3c from 'node-w3capi'
import type { NamedNode, Literal } from '@rdfjs/types'
import { Store, DataFactory } from 'n3'
import { ex, queryDataset, silos } from '../util.ts'
import { selectWithPredicate, type Entity } from './github.ts'

function toLiteral(value: string | number): Literal {
  return DataFactory.literal(`w3c:${value}`)
}

export async function aggregateW3C(dataset: Store): Promise<Store> {
  const updated = await aggregateIds(dataset)
  return aggregateGroups(updated)
}

export async function aggregateGroups(dataset: Store): Promise<Store> {
  const query = `
    SELECT ?s ?captured
    WHERE {
      ?s <${ex.siloId}> ?value .
      ?s a <${ex.Organization}> .
      FILTER regex(?value, "^w3c:")
      BIND(REPLACE(?value, "^w3c:", "") AS ?captured)
    }`
  const bindings = await queryDataset(dataset, query)
  const groups = bindings.map(b => ({ id: b.get('s') as NamedNode, value: b.get('captured')!.value }))
  for (const group of groups) {
    const groupUsers = await w3c.group(group.value).users().fetch({ embed: true })
    const peopleWithW3CId = await selectWithPredicate(dataset, ex.siloId, silos.w3c)
    const w3cPeople = groupUsers.filter((u: any) => peopleWithW3CId.find((e: Entity) => String(u.id) === e.value))
    for (const w3cPerson of w3cPeople) {
      const person = peopleWithW3CId.find((e: Entity) => e.value === String(w3cPerson.id))!
      const quad = DataFactory.quad(group.id, ex.terms.member, person.id)
      dataset.add(quad)
    }
  }
  return dataset
}

export async function aggregateIds(dataset: Store): Promise<Store> {
  const peopleWithGithubId = await selectWithPredicate(dataset, ex.siloId, silos.github)
  const peopleWithW3CId = await selectWithPredicate(dataset, ex.siloId, silos.w3c)
  const withoutW3CId = peopleWithGithubId.filter(entity => !peopleWithW3CId.find(e => entity.id.equals(e.id)))
  console.info(`Fetching w3c ids from github ids: ${withoutW3CId.length}`)
  for (const person of withoutW3CId) {
    try {
      const data = await w3c.user({ type: 'github', id: person.value }).fetch()
      const quad = DataFactory.quad(person.id, ex.terms.siloId, toLiteral(data.id))
      dataset.add(quad)
    } catch (e) {
      console.warn(`Couldn't find for ${person.id.value}`)
    }
  }
  return dataset
}

