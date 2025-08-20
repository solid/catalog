import fs from 'node:fs'
import { arrayifyStream } from 'arrayify-stream'
import { write } from '@jeswr/pretty-turtle'
import type { NamedNode } from '@rdfjs/types'
import { DataFactory, Literal, Store } from 'n3'
import { ex, queryDataset, readQuadStream, silos, type Silo } from '../util.ts'

export type Entity = { id: NamedNode, value: string }

export async function selectWithPredicate(dataset: Store, predicate: string, silo: Silo): Promise<Entity[]> {
  const query = `
    SELECT ?s ?captured
    WHERE {
      ?s <${predicate}> ?value .
      FILTER regex(?value, "^${silo.prefix}")
      BIND(REPLACE(?value, "^${silo.prefix}", "") AS ?captured)
    }`
  const bindings = await queryDataset(dataset, query)
  return bindings.map(b => ({ id: b.get('s') as NamedNode, value: b.get('captured')!.value }))
}

function toLiteral(value: string | number): Literal {
  return DataFactory.literal(`github:${value}`)
}

async function fetchUserByUsername(githubUsername: string) {
  const res = await fetch(`https://api.github.com/users/${githubUsername}`)
  return res.json()
}

async function fetchUserById(githubId: string) {
  const res = await fetch(`https://api.github.com/user/${githubId}`)
  return res.json()
}

export async function aggregateGithub(filePath: string): Promise<void> {
  const fromStream = await readQuadStream(filePath)
  const dataset = new Store(await arrayifyStream(fromStream))

  const withUsername = await selectWithPredicate(dataset, ex.siloUsername, silos.github)
  const withId = await selectWithPredicate(dataset, ex.siloId, silos.github)
  const withoutId = withUsername.filter(entity => !withId.find(e => entity.id.equals(e.id)))
  const withoutUsername = withId.filter(entity => !withUsername.find(e => entity.id.equals(e.id)))

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
  const outString = await write([...dataset])
  fs.writeFileSync(filePath, outString)
}
