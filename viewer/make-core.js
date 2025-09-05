import jsonld from 'jsonld';
import { DataFactory, Writer, Parser, Store } from 'n3';
import fs from 'node:fs'
import { write } from '@jeswr/pretty-turtle'
import { rdfParser } from 'rdf-parse'
import { arrayifyStream } from 'arrayify-stream'
import { rdfSerializer } from 'rdf-serialize';
import streamifyString from 'streamify-string';

const unWantedType = ['Ontology','Specification','ClassOfProduct'];
const unWantedCategory = ['ResearchPaper','Primer','OtherTechResource'];
const unWantedPredicate = ['conformsTo','hasDependencyOn','developer','platform','siloId','siloUsername','member'];

const vocabURL = 'http://example.org#';
const taxonomyURL = 'https://solidproject.solidcommunity.net/catalog/taxonomy#';

const inFile = '../catalog-data.ttl';
const coreFile = '../catalog-data-core.ttl';

/* Catalog Functions
 *     jsonld = removeUnWantedShapes(jsonld)
 *     jsonld = removeUnWantedPredicates(jsonld)
 */
function removeUnwantedShapes(graph){
  for(let unwanted of unWantedType){
    unwanted = vocabURL + unwanted;
    graph = graph.filter(obj => obj['@type'][0] != unwanted);
  }
  for(let unwanted of unWantedCategory){
    unwanted = taxonomyURL + unwanted;
    graph = graph.filter(item => {
      const subTypes = item['http://example.org#subType'] || ['dummy'];
      return !subTypes.some(obj => obj && obj['@id'] === unwanted);
    });
  }
  return graph;
}
function removeUnwantedPredicates(graph){
  for(let unwanted of unWantedPredicate){
    unwanted = vocabURL + unwanted;   
    graph = graph.map(obj => {
      const { [unwanted]: _, ...rest } = obj;
      return rest;
    });
  }
  return graph;
}
async function cleanup(){
  let turtleString,jsonldString,jsonld;
  try {
    turtleString = await fs.readFileSync(inFile, 'utf8');
  }
  catch(e) { console.log('File read error: ',e); process.exit(1); }
  try {
    jsonldString = await ttl2jsonld(turtleString);
    jsonld = JSON.parse(jsonldString);
  }
  catch(e) { console.log('JSON parse error :',e); process.exit(1); }
  console.log(`initial records = ${jsonld.length}`);
  jsonld =  removeUnwantedPredicates(jsonld);
  jsonld = removeUnwantedShapes(jsonld)
  console.log(`remaining records = ${jsonld.length}`);
  let nquads = await jsonld2nquads(jsonld, { format: 'application/n-quads' });
  turtleString = await nquads2ttl(nquads);
  fs.writeFileSync(coreFile, turtleString)
}

/* Conversion functions
 *     jsonldString          = await ttl2jsonld( turtleString )
 *     nquads                = jsonld2nquads( jsonldString )
 *     formattedTurtleString = nquads2ttl( nquads )
 */
async function ttl2jsonld(turtleString) {
  const parser = new Parser();
  const quads = parser.parse(turtleString);
  const store = new Store(quads);
  const quadStream = store.match();
  return new Promise((resolve, reject) => {
    const chunks = [];
    rdfSerializer.serialize(quadStream, { contentType: 'application/ld+json' })
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => resolve(chunks.join('')))
      .on('error', err => reject(err));
  });
}

async function jsonld2nquads(jsonldDoc) {
  const nquads = await jsonld.toRDF(jsonldDoc, { format: 'application/n-quads' });
  const parser = new Parser({ format: 'N-Quads' });
  return parser.parse(nquads);
}

function nquads2ttl(quads){
  const prefixes = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    con: "https://solidproject.solidcommunity.net/catalog/taxonomy#",
    cdata: "https://solidproject.solidcommunity.net/catalog/data#",
    ex: "http://example.org#",
  }
  return write(quads, { prefixes, ordered: true });
}

cleanup();
