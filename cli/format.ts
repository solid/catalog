import fs from 'node:fs'
import { write } from '@jeswr/pretty-turtle'
import { arrayifyStream } from 'arrayify-stream'
import { readQuadStream } from './util.ts'

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
