import fs from 'node:fs'
import { write } from '@jeswr/pretty-turtle'
import { rdfParser } from 'rdf-parse'
import { arrayifyStream } from 'arrayify-stream'

const prefixes = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  con: 'https://solidproject.solidcommunity.net/catalog/taxonomy#',
  cdata: 'https://solidproject.solidcommunity.net/catalog/data#',
  ex: 'http://example.org#',
}

export async function formatData(filePath: string): Promise<void> {
  const textStream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const fromStream = rdfParser.parse(textStream, {
    contentType: 'text/turtle',
  })
  const fromQuads = await arrayifyStream(fromStream)
  const outString = await write(fromQuads, { prefixes, ordered: true })

  fs.writeFileSync(filePath, outString)
}
