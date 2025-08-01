import fs from 'node:fs'
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rdfParser } from 'rdf-parse'
import { arrayifyStream } from 'arrayify-stream'
import { createVocabulary } from 'rdf-vocabulary'
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

for (const quad of quads) {
  const id = quad.subject
  const webid = quad.object

  if (!id.equals(webid)) {
    console.error(id.value, ' - does not match - ', webid.value)
    process.exit(1)
  }
}
