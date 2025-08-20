import fs from 'node:fs'
import { arrayifyStream } from 'arrayify-stream'
import { write } from '@jeswr/pretty-turtle'
import { Store } from 'n3'
import { ex, readQuadStream, changeObject, changeSubject } from '../util.ts'

export async function migrateWebid(filePath: string): Promise<void> {
  const fromStream = await readQuadStream(filePath)
  const dataset = new Store(await arrayifyStream(fromStream))

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

  const outString = await write([...dataset])
  fs.writeFileSync(filePath, outString)
}
