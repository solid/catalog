import * as $rdf from 'rdflib';
import { SolidNodeClient } from "solid-node-client";
const client = new SolidNodeClient;
const store = $rdf.graph();
const fetcher = $rdf.fetcher(store,{fetch:client.fetch});

const folder    = `file://`+process.cwd()+ '/';
const dataFile  = folder + "catalog-data.ttl";
const shaclFile = folder + "catalog-shacl.ttl";

const typePredicate = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const categoryNode= $rdf.sym('http://example.org#subType');
const shapeNode= $rdf.sym('https://solidproject.solidcommunity.net/catalog/shapes#SolidResourceShape');
const propertyNode = $rdf.sym('http://www.w3.org/ns/shacl#property');
const pathNode = $rdf.sym('http://www.w3.org/ns/shacl#path');
const inNode = $rdf.sym('http://www.w3.org/ns/shacl#in');

const vocabIRI = 'http://example.org#';
const taxonomyIRI = 'https://solidproject.solidcommunity.net/catalog/taxonomy#';
const categoryPredicate = $rdf.sym(vocabIRI+'subType');

function findKnownTypes(){
  let knownType = {};
  let propsNode = store.any(shapeNode,propertyNode);
  let props = store.any(propsNode,inNode);
  for(let type of props.elements){
    knownType[type.value]=true;
  }
  return knownType;
}

function findKnownPredicates(){
  let knownPredicate = {};
  let paths = store.match(null,pathNode);
  for(let path of paths){
    knownPredicate[path.object.value]=true;
  }
  return knownPredicate;
}

async function validateTypes(){
  try{
      await fetcher.load(dataFile);
      await fetcher.load(shaclFile);
  }
  catch(e){console.log(e)}
  let knownType = findKnownTypes();
  let knownPredicate = findKnownPredicates();
  let triples = store.match(null,null,null,$rdf.sym(dataFile));
  let handled = {}
  let errors = [];
  for(let triple of triples){
    if(handled[triple.subject]) continue;
    handled[triple.subject]=true;

    /* TYPES 
    */
    let types = store.match(triple.subject,typePredicate);
    if(types.length<1) {
      errors.push('Missing rdf:type - '+triple.subject.value);
      continue;
    }
    for(let type of types){
      let ntype = type.object.value;
      if(!knownType[ntype]){
        errors.push('Unknown rdf:type - '+triple.subject.value+" - "+ntype);
      }
    }

    /* PREDICATES
    */
    let predicates = store.match(triple.subject);
    for(let predicate of predicates){
      let pred = predicate.predicate.value;
      if(pred.match(/(type|modified)$/)) continue;
      if(!knownPredicate[pred]){
        errors.push('Unknown predicate - '+triple.subject.value+" - "+pred);
      }
    }

  }
  if(errors.length){
    console.log('ERROR(s)\n',errors);
    process.exit(1);
  }
  else {
    console.log(`
      ✓ all records have an rdf:type
      ✓ all rdf:types match known shapes
      ✓ all predicates match known shapes
    `)
  }
}
validateTypes();
