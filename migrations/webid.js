import fs from 'node:fs'
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rdfParser } from 'rdf-parse'
import { arrayifyStream } from 'arrayify-stream'
import { createVocabulary } from 'rdf-vocabulary'
import { write } from '@jeswr/pretty-turtle'
import { Store, DataFactory } from 'n3'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, '../catalog-data.ttl');
const ex = createVocabulary('http://example.org#', 'webid')

function changeSubject(quad, subject) {
  return DataFactory.quad(subject, quad.predicate, quad.object)
}

function changeObject(quad, object) {
  return DataFactory.quad(quad.subject, quad.predicate, object)
}

const textStream = fs.createReadStream(filePath, { encoding: 'utf8' })
const fromStream = rdfParser.parse(textStream, {
  contentType: 'text/turtle',
});
const dataset = new Store(await arrayifyStream(fromStream))

const quads = await arrayifyStream(dataset.match(null, ex.terms.webid, null))
console.log('records with webid ', quads.length)

for (const quad of quads) {
  const tmpId = quad.subject
  const webid = quad.object

  if (tmpId.equals(webid)) continue

  dataset.delete(quad)
  dataset.add(changeSubject(quad, webid))

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

const outString = await write([...dataset]);

fs.writeFileSync(filePath, outString)
