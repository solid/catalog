import {shacl2form} from './form.js';
import {prepNewRecordForm} from './pages.js';
import {pageContent} from '../pages/page-content.js';

export const store = UI.store;
export const fetcher = $rdf.fetcher(store);

export const rdf = $rdf;

const isa = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') ;
const pathNode = $rdf.sym('http://www.w3.org/ns/shacl#path') ;

/******************
 UTILITY FUNCTIONS
******************/

/* source - returns data locations and nodes
*/   
export function source(){
  window.currentFolder = window.location.href.replace(/\/pages\/[^\/]+$/,'/');
  return {
    dataURL   : currentFolder + 'catalog-data.ttl',
    shaclURL  : currentFolder + 'catalog-shacl.ttl',
    skosURL   : currentFolder + 'catalog-skos.ttl',
    newDataURL    : currentFolder + 'new-data/',
    vocURL    : 'http://example.org/',
    dataNode  : $rdf.sym(currentFolder + 'catalog-data.ttl'),
    shaclNode : $rdf.sym(currentFolder + 'catalog-shacl.ttl'),
    skosNode  : $rdf.sym(currentFolder + 'catalog-skos.ttl'),
      isa : $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
  }
}

/* node2label -- get label from type node e.g. 'http://ex/foo.ttl#Bar' = 'Bar'
*/   
export function node2label(thing){
  let label = thing.value ?thing.value :thing;
  return label.replace(/.*\//,'').replace(/.*#/,'');
}

/* findName -- get name predicate value from subject node
*/   
export function findName(url){
  if(!url) return "";
  let node = url.value ?url :$rdf.sym(url);
  const labelNode  = $rdf.sym(source().vocURL+'#name');
  let label = store.any(node,labelNode,null,source().dataNode);
  return (label && label.value) ?label.value :"";
}

/* findPrefLabel -- get prefLabel predicate value from subject node
*/   
export function findPrefLabel(subject){
  if(!subject) return "";
  let node = subject.value ?subject :$rdf.sym(subject);
  let labelNode = $rdf.sym("http://www.w3.org/2004/02/skos/core#prefLabel");
  let label = store.any(subject,labelNode,null,source().skosNode);
  return (label && label.value) ?label.value :"";
}

/* findNodeShapes - searches SHACL for NodeShapes
                    returns hash of shapes {shapeSubject:shapeLabel}
                    e.g. {'https://ex/#Product':'Product'}
*/
export function findNodeShapes(){
  const shapeNode = $rdf.sym('http://www.w3.org/ns/shacl#NodeShape');
  let shapes = store.each(null,isa,shapeNode,source().shaclNode);
  console.log(source().shaclNode.value,shapes)    
  let knownShape = {} ;
  for(let s of shapes){
    knownShape[s.value] = node2label(s.value);
  }
  return knownShape;
}

/* findKnownSubTypes - searches SKOS for subTypes
                    returns hash of shapes {shapeSubject:shapeLabel}
                    e.g. {'https://ex/#Product':'Product'}
*/
export function findKnownSubTypes(){
  let subTypes = store.match(null,null,null,source().skosNode);
  let knownSubType = {} ;
  for(let t of subTypes){
//      let label = store.match(t,prefLabelNode,null,source().skosNode);
      let label = findPrefLabel(t.subject);
    knownSubType[t.subject.value] = label ;
  }
  return knownSubType;
}

/* parseRdfCollection -- finds SKOS concepts from a collection
*/   
export function parseRdfCollection(collectionNode) {
  const entries = collectionNode.elements;
  const concepts = [];
  for(var subject of entries){
    let concept = findPrefLabel(subject);
    if(concept) concepts.push(`<option value="${subject.value}">${concept}</option>`);
  }
  return concepts;
}

/* loadCatalog -- loads data, shacl, and skos into the store
*/   
export async function loadCatalog() {
  try{
    await fetcher.load(source().shaclURL);
    await fetcher.load(source().skosURL);
    await fetcher.load(source().dataURL);
  }
  catch(e){console.log(e);}
}

/* findUniqueSubjects -- unique list of subjects in the data
*/   
export function findUniqueSubjects(){
  const subjects = [];
  const isSubject = {}
  const notUnique = store.match(null,null,null,source().dataNode);
  for(let s of notUnique){
    if(isSubject[s.subject.value]) continue;
    isSubject[s.subject.value] = true;
    subjects.push(s.subject);
  }
  return subjects;
}

/* PAGE DISPLAY */

/*
  showPage -- dispatches to appropriate page display
*/
export async function showPage(pageType,options){
  options ||= {};
  const o = Object.assign({},parent.window.options(),options);
  let main = parent.document.getElementById('searchPage');
  let iframe = parent.document.getElementById('iframeDisplay');
  let shaclURL = o.shaclURL;
  if(pageType=='main'){
    let main = parent.document.getElementById('searchPage');
    main.style.display="block";
    iframe.style.display="none";
  }
  if(pageType=='type-chooser'){
    iframe.innerHTML = pageContent.typeChooser;
    await prepNewRecordForm(o.shaclURL);
    main.style.display = "none";
    iframe.style.display = "block";
  }
  if(pageType=='record'){
    main.style.display = "none";
    iframe.style.display = "block";
    const shape    = node2label(o.type);
    iframe.innerHTML = `<div id="menubar"></div><form id="shacl2form"></form>`;
    await shacl2form(shape,o.id);
//    if(o.id) loadRecord(o.id);
  }
}

/*
  search -- performs search & returns results as ul HTML string
*/
export async function search(term){
  await fetcher.load(source().dataURL);
  const dataNode  = source().dataNode;
  let vocURL = source().vocURL;
  const labelNode  = $rdf.sym(vocURL+'#name');
  let subjects = [... new Set( store.match(null,null,null,dataNode).map(match => match.subject) )];
  let string2search = `<ul class="search-results">`;
  for(let subject of subjects){
    const label = (store.any(subject,labelNode,null,dataNode)||{}).value;
    if(label && label.match(new RegExp(term,'i'))) { 
      string2search += ( `<li><a href="${subject.value}">${label}</a></li>\n` );  
    }
  }
  return(string2search+"</ul>");
}

/* END OF FILE */
