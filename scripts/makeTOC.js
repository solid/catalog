import {store,fetcher,source,findUniqueSubjects,parseRdfCollection,loadCatalog} from './utils.js';

export async function makeTOC(displayElement){
  let tree = await skos2toc(displayElement) ;
//  displayElement.appendChild(tree);
  await addTocListeners();
}

function findTypes(){
  let types={};
  const shaclPrefix = 'http://www.w3.org/ns/shacl#';
  const shaclNode = source().shaclNode;
//  const resourceShapeNode = UI.rdf.sym('urn:x-base:default#SolidResourceShape');
  const resourceShapeNode = UI.rdf.sym(source().shaclURL+'#SolidResourceShape');
  const propertyNode = UI.rdf.sym(shaclPrefix+'property');
  const collectionProperty = store.any( resourceShapeNode, propertyNode );
  const collectionNode = store.any( collectionProperty,UI.rdf.sym(shaclPrefix+'in') );
  for(let e of collectionNode.elements){
    types[e.value]=true
  }
  return types;
}
function countResources(resourceTypes){
   let resourceRecords = [];  
   const isa = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') ;
   let uniqueRecords = findUniqueSubjects();
   for(let r of uniqueRecords){
     let recordTypes = store.each(r,isa);
     for(let rt of recordTypes){
       if(resourceTypes[rt.value]){
         resourceRecords.push(rt.value);
       }
     }
   }
   return resourceRecords.length;  
}
async function skos2toc(displayElement){
  let toc = document.createElement('div');
  displayElement.appendChild(toc);
  toc.setAttribute('id','toc');
  await loadCatalog();
  const skosPrefix = 'http://www.w3.org/2004/02/skos/core#';
  const skosNode = source().skosNode;
  const taxonomyNode = UI.rdf.sym( source().skosURL + '#SolidCatalogTaxonomy' );
  const topConceptNode = UI.rdf.sym( skosPrefix + 'hasTopConcept' );
  const labelNode = UI.rdf.sym( skosPrefix + 'prefLabel' );
  const altLabelNode = UI.rdf.sym( skosPrefix + 'altLabel' );
  const narrower = UI.rdf.sym( skosPrefix + 'narrower' );
  const broader = UI.rdf.sym( skosPrefix + 'broader' );
  let top = store.each(taxonomyNode,topConceptNode);
  let str = "";
  for(let topConcept of top){
    let value = topConcept.uri;
    let label = (store.any(topConcept,altLabelNode)||{}).value
              || (store.any(topConcept,labelNode)||{}).value;
    let subtypes = store.each(topConcept,narrower);
    if(subtypes.length==0) subtypes = store.each(null,broader,topConcept);
    if(subtypes.length==0){
      let div = document.createElement('div');
      let anc = document.createElement('a');
      anc.setAttribute('href',`javascript:void(0)`);
      anc.setAttribute('onclick',`sh('${value}','${label}')`);
      anc.setAttribute('about',value);
      anc.classList.add('type');
      anc.innerHTML = label;
      div.appendChild(anc);
      toc.appendChild(div);
    }
    else {
      let div = document.createElement('div');
      div.classList.add('type');
      div.innerHTML = label;
      toc.appendChild(div);
    }
    for(let subtype of subtypes){
      let tlabel = (store.any(subtype,labelNode)||{}).value;
      tlabel = tlabel.replace(/\(.*$/,'');
      let div2 = document.createElement('div');
      let anc = document.createElement('a');
      let href=subtype.uri;
      try {
        anc.setAttribute('data-href',href);
        anc.setAttribute('href','#');
        anc.classList.add('subtype');
        anc.setAttribute('onclick',`sh('${subtype.value}','${tlabel}')`);
        anc.textContent = tlabel;
        div2.appendChild(anc);
        toc.appendChild(div2);
      }
      catch(e){console.log(88,e)}
    }
  }
  return toc;
}

async function addTocListeners(){
  let resourceTypes = findTypes();
  let count = countResources(resourceTypes);
  let dataNode = source().dataNode;
  let hasSubtype = source().subtypeNode ;
  let anchors = document.querySelectorAll('#toc a');
  for(let anchor of anchors){
    let field = anchor.getAttribute('data-href') || anchor.getAttribute('href');
    let subtype = UI.rdf.sym(field);
    let instances = store.each(null,hasSubtype,subtype);
    if(instances.length>0){
      anchor.parentNode.innerHTML += ` <span class="number">${instances.length}</span>`;
    }
    else anchor.remove();
  }
  document.getElementById('toc').innerHTML += `<p>${count} total records</p>`;
}
