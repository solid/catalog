import { arrayifyStream } from 'arrayify-stream'
import type { Store } from 'n3'
import { ex, changeObject, changeSubject } from '../util.ts'

export async function migrateWebid(dataset: Store): Promise<Store> {
  // TODO: fix TS error
  // @ts-expect-error
  const quads = await arrayifyStream(dataset.match(null, ex.terms.webid, null))
  console.info('records with webid ', quads.length)

  for (const quad of quads) {
    const tmpId = quad.subject
    const webid = quad.object

    if (tmpId.equals(webid)) continue

    // this will also update the ex:webid statement itself
    const subMatches = await arrayifyStream(dataset.match(tmpId, null, null))
    for (const q of subMatches) {
      dataset.delete(q)
      dataset.add(changeSubject(q, webid))
    }
    const objMatches = await arrayifyStream(dataset.match(null, null, tmpId))
    for (const q of objMatches) {
      dataset.delete(q)
      dataset.add(changeObject(q, webid))
    }
  }
  return dataset
}
