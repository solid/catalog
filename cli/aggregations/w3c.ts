import w3c from 'node-w3capi'
import type { Literal } from '@rdfjs/types'
import { DataFactory, type Store } from 'n3'
import { ex, entitiesDifference, selectSiloEntities, silos } from '../util.ts'

function toLiteral(value: string | number): Literal {
  return DataFactory.literal(`w3c:${value}`)
}

export async function aggregateW3C(dataset: Store): Promise<Store> {
  const updated = await aggregateIds(dataset)
  return aggregateGroups(updated)
}

export async function aggregateGroups(dataset: Store): Promise<Store> {
  const extraWhere = `?s a <${ex.Organization}> .`
  const groups = await selectSiloEntities(dataset, ex.siloId, silos.w3c, extraWhere)

  for (const group of groups) {
    const groupUsers = await w3c.group(group.value).users().fetch({ embed: true })

    const peopleWithW3CId = await selectSiloEntities(dataset, ex.siloId, silos.w3c)
    const peopleMap = new Map(peopleWithW3CId.map(p => [p.value, p]))

    for (const user of groupUsers) {
      const person = peopleMap.get(String(user.id))
      if (person) {
        dataset.add(DataFactory.quad(group.id, ex.terms.member, person.id))
      }
    }
  }
  return dataset
}

export async function aggregateIds(dataset: Store): Promise<Store> {
  const peopleWithGithubId = await selectSiloEntities(dataset, ex.siloId, silos.github)
  const peopleWithW3CId = await selectSiloEntities(dataset, ex.siloId, silos.w3c)
  const withoutW3CId = entitiesDifference(peopleWithGithubId, peopleWithW3CId)

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

