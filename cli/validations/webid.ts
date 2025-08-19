import { arrayifyStream } from 'arrayify-stream'
import { Store } from 'n3'
import { ex, readQuadStream } from '../util.ts'

export async function validateWebid(filePath: string): Promise<void> {

  const fromStream = await readQuadStream(filePath)
  const dataset = new Store(await arrayifyStream(fromStream))

  // TODO: fix TS error
  // @ts-expect-error
  const quads = await arrayifyStream(dataset.match(null, ex.terms.webid, null))
  for (const quad of quads) {
    const id = quad.subject
    const webid = quad.object
    if (!id.equals(webid)) {
      console.error(id.value, ' - does not match - ', webid.value)
      process.exit(1)
    }
  }
}
