import fs from 'node:fs'
import { stringify as stringifyStream } from '@jeswr/stream-to-string'
import { transform } from 'rdf-transform'
import { stringify as stringifyYaml } from 'yaml'

import jsonld from 'jsonld'

import { context } from './context.js'

const filename = 'catalog-data.ttl'
const inStream = fs.createReadStream(filename, { encoding: 'utf8' })

const nquads = await stringifyStream(
  transform(inStream, {
    from: { contentType: 'text/turtle' },
    to: { contentType: 'application/n-triples', },
  })
)

const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' })

const compacted = await jsonld.compact(doc, context)
const graph = compacted['@graph']

const organized = {
  '@context': 'https://solidproject.solidcommunity.net/catalog/context',
  '@graph': [
    ...graph.filter(record => record.subType === 'con:Specification').toSorted(/* */),
    ...graph.filter(record => record.type === 'CreativeWork').toSorted(/* */),
  ]
}

function sortProperties(a, b) {
  const order = ['id', 'type', 'subType', 'name', 'description', 'landingPage', 'repository', 'author', 'editor', 'definesConformanceFor']
  return order.indexOf(a.key.value) - order.indexOf(b.key.value)
}
console.log(stringifyYaml(organized, null, { sortMapEntries: sortProperties }))
