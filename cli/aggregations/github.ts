import type { Literal } from '@rdfjs/types'
import { DataFactory, type Store } from 'n3'
import { ex, entitiesDifference, silos, selectSiloEntities } from '../util.ts'


function toLiteral(value: string | number): Literal {
  return DataFactory.literal(`github:${value}`)
}

async function fetchUserByUsername(githubUsername: string) {
  const res = await fetch(`https://api.github.com/users/${githubUsername}`)
  return res.json()
}

// different endpoint than by user name
async function fetchUserById(githubId: string) {
  const res = await fetch(`https://api.github.com/user/${githubId}`)
  return res.json()
}

export async function aggregateGithub(dataset: Store): Promise<Store> {
  const withUsername = await selectSiloEntities(dataset, ex.siloUsername, silos.github)
  const withId = await selectSiloEntities(dataset, ex.siloId, silos.github)
  const withoutId = entitiesDifference(withUsername, withId)
  const withoutUsername = entitiesDifference(withId, withUsername)

  console.info(`Fetching ids from usernames: ${withoutId.length}`)
  for (const user of withoutId) {
    const data = await fetchUserByUsername(user.value)
    const quad = DataFactory.quad(user.id, ex.terms.siloId, toLiteral(data.id))
    dataset.add(quad)
  }

  console.info(`Fetching usernames from ids: ${withoutUsername.length}`)
  for (const user of withoutUsername) {
    const data = await fetchUserById(user.value)
    const quad = DataFactory.quad(user.id, ex.terms.siloUsername, toLiteral(data.login))
    dataset.add(quad)
  }

  return dataset
}
