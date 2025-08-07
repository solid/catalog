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
//  window.currentFolder = window.location.href.replace(/\/pages\/[^\/]+$/,'/');
  window.currentFolder = window.location.href.replace(/\/pages\//,'/').replace(/\?.*/,'').replace(/\#.*/,'').replace(/viewer\.html/,'');
  let vocURL= 'http://example.org';
//  let shaclURL = 'urn:x-base:default' ;
//   let shaclURL = currentFolder + 'catalog-shacl.ttl';
  let dataURL = 'https://solidproject.solidcommunity.net/catalog/data';
  let shaclURL = 'https://solidproject.solidcommunity.net/catalog/shapes';
  let skosURL = 'https://solidproject.solidcommunity.net/catalog/taxonomy';
  return {
    dataLoadURL   : currentFolder + 'catalog-data.ttl',
    shaclLoadURL  : currentFolder + 'catalog-shacl.ttl',
    skosLoadURL   : currentFolder + 'catalog-skos.ttl',
    newDataURL    : currentFolder + 'new-data/',
    dataURL,
    shaclURL,
    skosURL,
    vocURL,
    dataNode  : $rdf.sym(dataURL),
    shaclNode : $rdf.sym( shaclURL),
    skosNode  : $rdf.sym(skosURL),
   isa : $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    subtypeNode : $rdf.sym(vocURL+'#subType'),
    techKeywordsNode : $rdf.sym(vocURL+'#technicalKeyword'),
    socKeywordsNode : $rdf.sym(vocURL+'#socialKeyword'),
  }
}

/* node2label -- get label from type node e.g. 'http://ex/foo.ttl#Bar' = 'Bar'
*/   
export function node2label(thing){
  let label = thing.value ?thing.value :thing;
  return label.replace(/.*#/,'').replace(/.*\//,'');
}

/* findName -- get name predicate value from subject node
*/   
export function findName(url){
  if(!url) return "";
  let node = url.value ?url :$rdf.sym(url);
  const labelNode  = $rdf.sym(source().vocURL+'#name');
  let label = store.any(node,labelNode);
  return (label && label.value) ?label.value :"";
}

/* findPrefLabel -- get prefLabel predicate value from SKOS subject node
*/   
export function findPrefLabel(subject){
  if(!subject) return "";
  let node = subject.value ?subject :$rdf.sym(subject);
//  node.value = source().skosURL + node.value.replace(/^.*\#/,'#');
  let labelNode = $rdf.sym("http://www.w3.org/2004/02/skos/core#prefLabel");
  let label = store.any(node,labelNode,);
  return (label && label.value) ?label.value :"";
}

/* findShaclName -- get sh:name from SHACL subject node
*/   
export function findShaclName(subject){
  if(!subject) return "";
  let node = subject.value ?subject :$rdf.sym(subject);
  let labelNode = $rdf.sym('http://www.w3.org/ns/shacl#name');
  let label = store.any(subject,labelNode);
  return (label && label.value) ?label.value :"";
}

/* findNodeShapes - searches SHACL for NodeShapes
                    returns hash of shapes {shapeSubject:shapeLabel}
                    e.g. {'https://ex/#Product':'Product'}
*/
export function findNodeShapes(){
  const shapeNode = $rdf.sym('http://www.w3.org/ns/shacl#NodeShape');
  const targetNode = $rdf.sym('http://www.w3.org/ns/shacl#targetClass');
  let shapes = store.each(null,isa,shapeNode);
  let knownShape = {} ;
  for(let s of shapes){
//    knownShape[s.value] = node2label(s.value);
//    knownShape[s.value] = findShaclName(s);
    const targetClass = store.any(s,targetNode);
    knownShape[targetClass] = findShaclName(s);
  }
  return knownShape;
}

/* findKnownSubTypes - searches SKOS for subTypes
                    returns hash of shapes {shapeSubject:shapeLabel}
                    e.g. {'https://ex/#Product':'Product'}
*/
export function findKnownSubTypes(){
  let nodeShapeNode = $rdf.sym('http://www.w3.org/2004/02/skos/core#NodeShape');
  let subTypes = store.match(null,null,null,source().skosNode);
  let knownSubType = {} ;
  for(let t of subTypes){
    let label = findPrefLabel(t.subject);
    knownSubType[t.subject.value] = label ;
//    knownSubType[t.subject.value] = true ;
  }
  return knownSubType;
}
export function findRecord(subjectURL){
  const subject = $rdf.sym(subjectURL);
/*
  let predicates = store.match(subject,null,null,source().dataNode);
  let objects = store.match(null,null,subject,source().dataNode) ;
*/
  let predicates = store.match(subject);
  let objects = store.match(null,null,subject) ;
  let record = getRecordPredicates({},subject,predicates,'subject');
  record = getRecordPredicates(record,subject,objects,'object');
  return record;
}

function isLink(val){
  val = val.replace(source().vocURL+'#','');
  let link = {
    webid : true,
    repository : true,
    videoCallPage : true,
    showcase : true,
    serviceEndpoint : true,
    landingPage : true,
  }
  return link[val];
}

function getRecordPredicates(record,subject,triples,posOfThing) {
  let isPred = {};
  let name = findName(subject);
  let subtype = store.each(subject,source().subtypeNode);
  for(let s of subtype){
 //   if(s.value.match(source().skosURL)) s = findPrefLabel(s);
     let x = findPrefLabel(s);
     if(x) s = x;

  }
  for(let p of triples){
    if(isPred[p.predicate.value]) continue;
    isPred[p.predicate.value]=true;
    let fieldName = node2label(p.predicate.value);
    let newValue = posOfThing==='subject' 
      ? store.match(subject,p.predicate)
      : store.match(null,p.predicate,subject);
    let valArray= [];
    for(let nv of newValue){
      let n = posOfThing==='subject' ?{...nv.object} :{...nv.subject};  
      if(n.value.match(source().skosURL)){
        n.value = findPrefLabel(n.value);
      }
      else if(p.predicate.value.match(/keyword/i)){
        n.value = `<a href="${n.value}">${n.value}</a>`;
      }
      else if(n.value.startsWith('http')&& !isLink(p.predicate.value)) {
//      else if(n.value.match(source().dataURL)){
        let label = findName(n.value);
        if(label) n.value = `<a href="${n.value}">${label}</a>`;
      }
      valArray.push(n.value);
    }
    let fieldValue= valArray.join(', ')
    if(p.predicate.value.match(/subType/i)) fieldValue = subtype;
    if(posOfThing==='object') fieldName += "Of";
    record[fieldName]=fieldValue;
  }
  let type = store.each(subject,source().isa);
//  record.type = node2label(type);
  for(let t of type) t = t.value;
  record.type = type;
  return record;
}

/* array.isort() -- case-insensitive sort
*/
Array.prototype.isort = function() {
    return this.sort((a, b) => {
        a=a.value||a.label||a;
        b=b.value||b.label||b;
        const nameA = a.toLowerCase(); // Convert to lowercase
        const nameB = b.toLowerCase(); // Convert to lowercase
        if (nameA < nameB) {
            return -1; // a comes before b
        }
        if (nameA > nameB) {
            return 1; // a comes after b
        }
        return 0; // a and b are equal
    });
};

/*
export function findRecordsByType(type){
  let subs = [];
  let records = store.match(null,source().isa,$rdf.sym(type),source().dataNode).map(match => match.subject);
  return records.isort();
}
*/
export function findRecordsBySubtype(subtype){
  let records = [];
  const category = $rdf.sym(subtype);
  let matched = store.match(null,source().subtypeNode,category);
  if(matched.length==0) matched = store.match(null,source().isa, category)
  for(let m of matched){
     let link = m.subject.value;
     let label = findName(m.subject);
     records.push({label,link});
  }
  return records.isort();
}
/*
export function findRecordsByTechKeyword(keyword){
  let records = [];
//  let raw = store.match(null,source().techKeywordsNode,null,source().dataNode);
  let raw = store.match(null,source().techKeywordsNode);
  for(let r of raw){
    if(r.object.value.trim().match(keyword)){
      let label = findName(r.subject);
      records.push({label,link:r.subject.value});
    }
  }
  return records.isort();
}
*/
export function findRecordsByKeyword(keyword){
  let records = [];
  let tech = store.match(null,source().techKeywordsNode);
  let soc = store.match(null,source().socKeywordsNode);
  for(let r of tech.concat(soc)){
    if(!keyword || r.object.value.trim().match(keyword)){
      let label = findName(r.subject);
      records.push({link:r.subject.value,label});
    }
  }
  records.sort((a, b) => {
    if (a.label < b.label) return -1;
    if (a.label > b.label) return 1;
    return 0;
  });
  return records;
}
export function findKeywords(){
  let allKeys = [];
  let isKey = {};
  let tech = store.match(null,source().techKeywordsNode);
  let soc = store.match(null,source().socKeywordsNode);
  for(let r of tech.concat(soc)){
    let keys = r.object.value;
    keys = keys.match(/,/) ?keys.split(/,/) :[keys];
    for(let key of keys){   
      if(isKey[key]) continue ;
      isKey[key]=true;
      allKeys.push(key);
    }
  }
  return allKeys.isort();
}


export function findTechKeywords(subtype){
  let keys = [];
  let isKey = {};
  let records = store.match(null,source().subtypeNode,$rdf.sym(subtype),source().dataNode).map(match => match.subject);
  for(let r of records){
    let keywords = store.each(r,source().techKeywordsNode,null,source().dataNode);
    for(let k of keywords){
      let k2 = k.value.split(',');
      for(let k3 of k2){
        if(isKey[k3]) continue;
        isKey[k3]=true;
        keys.push(k3.trim());
      }
    }
  }
  return keys.isort();
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

export function isLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '::1'; // For IPv6 localhost
}

/* loadCatalog -- loads data, shacl, and skos into the store
*/   
export async function loadCatalog() {
/*
  let data = isLocalhost() ? source().dataLoadURL : source().dataURL ;
  let shacl = isLocalhost() ? source().shaclLoadURL : source().shaclURL ;
  let skos = isLocalhost() ? source().skosLoadURL : source().skosURL ;
*/
  let data = source().dataLoadURL;
  let shacl = source().shaclLoadURL;
  let skos = source().skosLoadURL;
  try{
    await fetcher.load(shacl);
    await fetcher.load(skos);
    await fetcher.load(data);
  }
  catch(e){console.log(e);}
}

/* findUniqueSubjects -- unique list of subjects in the data
*/   
export function findUniqueSubjects(){
  const subjects = [];
  const isSubject = {}
  const notUnique = store.match(null,null);
  for(let s of notUnique){
    if(isSubject[s.subject.value]) continue;
    isSubject[s.subject.value] = true;
    subjects.push(s.subject);
  }
  return subjects;
}

/* findFullText
*/   
export function findFullText(term){
  const subjects = [];
  const isSubject = {}
//  const notUnique = store.match(null,null,null,source().dataNode);
  const notUnique = store.match();
  for(let s of notUnique){
    let recordStr="";
    if(isSubject[s.subject.value]) continue;
    isSubject[s.subject.value] = true;
//    let all = store.match(s.subject,null,null,source().dataNode);
    let all = store.match(s.subject);
    for(let a of all){  
      recordStr += [a.subject.value,a.predicate.value,a.object.value].join(" ");
    }
    let rterm = new RegExp(term,'i');
    if(recordStr.match(rterm)){
      let label = findName(s.subject);
      if(!label) continue;
      subjects.push({link:s.subject.value,label});
      continue;
    }
  }
  return subjects.isort();
}

/* PAGE DISPLAY */

/*
  showPage -- dispatches to appropriate page display
*/
export async function showPage(pageType,options){
  options ||= {};
  const o = Object.assign({},source(),options);
//  let main = parent.document.getElementById('searchPage');
  let main = parent.document.getElementById('main-content');
  let form = parent.document.querySelector('form.record');
  let formsArea = parent.document.getElementById('forms-area');
//  let iframe = parent.document.getElementById('iframeDisplay');
  let iframe = formsArea;
  let shaclURL = source().shaclURL;
  if(pageType=='main'){
//    let main = parent.document.getElementById('searchPage');
    main.style.display="block";
//    form.classList.add('formHidden');
formsArea.innerHTML="";
formsArea.style.display="none";
main.style.display="block";
//    iframe.style.display="none";
  }
  if(pageType=='type-chooser'){
    iframe.innerHTML = pageContent.typeChooser;
    await prepNewRecordForm(source().shaclURL);
    main.style.display = "none";
    iframe.style.display = "block";
  }
  if(pageType=='record'){
    main.style.display = "none";
    iframe.style.display = "block";
    let shape    = node2label(o.type);
    iframe.innerHTML = `<div id="menubar"></div><form id="shacl2form"></form>`;
//shape = shape.replace('>','Shape');;
    await shacl2form(shape,o.id);
  }
}

/*
  search -- performs search & returns results as ul HTML string
*/
export async function search(term){
//  await fetcher.load(source().dataURL);
  const dataNode  = source().dataNode;
  let vocURL = source().vocURL;
  const labelNode  = $rdf.sym(vocURL+'#name');
  let subjects = [... new Set( store.match(null,null,null,dataNode).map(match => match.subject) )];
  let string2search = `<ul class="search-results">`;
  for(let subject of subjects){
//    const label = (store.any(subject,labelNode,null,dataNode)||{}).value;
    const label = (store.any(subject,labelNode)||{}).value;
    if(label && label.match(new RegExp(term,'i'))) { 
//      string2search += ( `<li><a href="${subject.value}">${label}</a></li>\n` );  
      string2search += ( `<li><a href="${subject.value}">${label}</a></li>\n` );  
    }
  }
  return(string2search+"</ul>");
}

/* END OF FILE */
