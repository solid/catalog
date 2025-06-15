import * as $rdf from 'rdflib';

const store = $rdf.graph();
const fetcher = $rdf.fetcher(store);

const typePredicate = $rdf.sym(`http://www.w3.org/1999/02/22-rdf-syntax-ns#type`);
const subtypePredicate = $rdf.sym('http://example.org/#subType');
const modifiedPredicate = $rdf.sym('http://example.org/#modified');
const concept = $rdf.sym('http://www.w3.org/2004/02/skos/core#Concept') ;

const base = 'http://localhost:8444/home/s/catalog/';
const dataNode = $rdf.sym(base+'catalog-data.ttl');
const shaclNode = $rdf.sym(base+'catalog-shacl.ttl');
const skosNode = $rdf.sym(base+'catalog-skos.ttl');

let topType = {};

async function report(){
  await fetcher.load( dataNode );
  await fetcher.load( shaclNode );
  await fetcher.load( skosNode );
  findTopTypes();
  let records = store.match(null,null,null,dataNode);
  let uniqueRecords = [];
  let isSubject = {};
  for(let record of records){
    let subject = record.subject;    
    if(isSubject[subject]) continue;
    isSubject[subject]=true;
    uniqueRecords.push(subject)
  }
  console.log( `${uniqueRecords.length} total records` );
  for(let record of uniqueRecords){
    record = record;
    let type = isType( store.each(record,typePredicate,null,dataNode) );
    let subtype = isSubtype( store.any(record,subtypePredicate,null,dataNode) );
    if(!type) console.log( `No type : ${record.value}`);
    if(!subtype) console.log( `No subtype : ${record.value}` );
  }
//  showModifiedRecords(uniqueRecords);
}
function isSubtype(subtype){
  let knownSubtype = store.any(subtype,typePredicate,null);
  return (knownSubtype && knownSubtype.value==concept.value)
}
function isType(type){
  for(let t of type){
    if(topType[t.value]) return true;
  }
  return false;
}
function findTopTypes(){
   let shape = $rdf.sym(shaclNode.uri+'#SolidResourceShape');
   const propertyPredicate = $rdf.sym('http://www.w3.org/ns/shacl#property');
   const collectionPredicate = $rdf.sym('http://www.w3.org/ns/shacl#in');
   let property = store.any(shape,propertyPredicate,null);
   let collection = store.any(property,collectionPredicate);
   for(let type of collection.elements){
     topType[type.value] = true;
   }
}
function showModifiedRecords(records){
  let modified = [];
  for(let record of records){
    let timestamp = store.any(record,modifiedPredicate);
    if(!timestamp) continue;
    modified.push({record,timestamp:timestamp.value});
  }
  modified.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  console.log(modified)
}
report();
