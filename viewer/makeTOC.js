import {store,fetcher,source,findUniqueSubjects,parseRdfCollection,loadCatalog,isLocalhost} from './utils.js';

export async function makeTOC(displayElement){
  let tree = await skos2toc(displayElement) ;
  await addTocListeners();
}

function findTypes(){
  let types={};
  const shaclPrefix = 'http://www.w3.org/ns/shacl#';
  const shaclNode = source().shaclNode;
  const resourceShapeNode = UI.rdf.sym(source().shaclURL+'#SolidResourceShape');
  const propertyNode = UI.rdf.sym(shaclPrefix+'property');
  const collectionProperty = store.any( resourceShapeNode, propertyNode );
  const collectionNode = store.any( collectionProperty,UI.rdf.sym(shaclPrefix+'in') );
  if(collectionNode) {
    for(let e of collectionNode.elements){
      types[e.value]=true
    }
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
function sectionSlug(label){
  return (label||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
const PATH_TO_SECTION = {
  '/learning': 'learning-resources',
  '/participation': 'participation-opportunities',
  '/apps': 'apps-and-services',
  '/libraries': 'software-libraries',
  '/people': 'organizations-and-people',
};
function currentSection(){
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if(PATH_TO_SECTION[path]) return PATH_TO_SECTION[path];
  const p = new URLSearchParams(window.location.search);
  return p.get('section') || '';
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
  const section = currentSection();
  if(section){
    top = top.filter(tc => {
      const lbl = (store.any(tc,altLabelNode)||{}).value || (store.any(tc,labelNode)||{}).value;
      return sectionSlug(lbl) === section;
    });
  }
  let str = "";
  for(let topConcept of top){
    let value = topConcept.uri;
    let label = (store.any(topConcept,altLabelNode)||{}).value
              || (store.any(topConcept,labelNode)||{}).value;
    let subtypes = store.each(topConcept,narrower);
    if(subtypes.length==0) subtypes = store.each(null,broader,topConcept);
    if(subtypes.length==0){
      let div1 = document.createElement('div');
      let anc = document.createElement('a');
      anc.setAttribute('data-href',value);
      anc.setAttribute('href',`javascript:void(0)`);
      anc.setAttribute('onclick',`sh('${value}','${label}')`);
      anc.setAttribute('about',value);
      anc.classList.add('type');
      anc.innerHTML = label;
      toc.appendChild(div1);
      div1.appendChild(anc);
    }
    else if(!section){
      // Top-level category heading: plain, non-clickable label.
      // On a single-section page it's just the page title, so we omit it.
      const div = document.createElement('div');
      div.classList.add('type');
      div.textContent = label;
      toc.appendChild(div);
    }
    for(let subtype of subtypes){
      let tlabel = (store.any(subtype,altLabelNode)||{}).value 
                 || (store.any(subtype,labelNode)||{}).value ;

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
  let hasSubtype = source().subtypeNode ;
  let anchors = document.querySelectorAll('#toc a');
  let subcount = 0;
  let emptyCount = 0;
  for(let anchor of anchors){
    const subtypesAttr = anchor.getAttribute('data-subtypes');
    let total;
    if(subtypesAttr){
      total = 0;
      for(const uri of subtypesAttr.split('|')){
        const node = UI.rdf.sym(uri);
        let inst = store.each(null,hasSubtype,node);
        if(inst.length===0) inst = store.each(null,source().isa,node);
        total += inst.length;
      }
    } else {
      const field = anchor.getAttribute('data-href') || anchor.getAttribute('href');
      const subtype = UI.rdf.sym(field);
      let inst = store.each(null,hasSubtype,subtype);
      if(inst.length===0) inst = store.each(null,source().isa,subtype);
      total = inst.length;
    }
    const instances = { length: total };
    if(!subtypesAttr) subcount += instances.length;
    const isEmpty = instances.length === 0;
    if(isEmpty){
      emptyCount++;
      anchor.parentNode.classList.add('is-empty');
    }
    const badge = document.createElement('span');
    badge.className = 'number' + (isEmpty ? ' empty' : '');
    badge.textContent = instances.length;
    anchor.parentNode.appendChild(document.createTextNode(' '));
    anchor.parentNode.appendChild(badge);
  }
  const toc = document.getElementById('toc');
  const total = document.createElement('p');
  total.className = 'toc-total';
  total.textContent = `${count} total records`;
  toc.appendChild(total);
  if(emptyCount > 0){
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toc-show-empty';
    const setLabel = () => {
      const showing = toc.classList.contains('show-empty');
      toggle.textContent = showing
        ? `Hide ${emptyCount} empty`
        : `Show ${emptyCount} empty`;
    };
    setLabel();
    toggle.addEventListener('click', () => {
      toc.classList.toggle('show-empty');
      setLabel();
    });
    toc.appendChild(toggle);
  }
}
