import {rdf,store,fetcher,loadCatalog,source,findName,findUniqueSubjects,findNodeShapes,findKnownSubTypes,node2label,findShaclName,findPrefLabel} from './utils.js'
const $rdf=rdf;

export function unCamel(str) {
  return str.replace(/([A-Z])/g, ' $1').trim();
}

export async function report(){
  let all = await getTypes();
  let date = new Date().toLocaleDateString();
  let tree = `<p><b>Solid Resources Catalog Report</b> (${date}) ${all.subjects.length} records</p>`;
  tree += reportMissing(all.types,all.subTypes,all.missingNames,all.duplicatedNames) ;
  return tree;
}
export function makeTypesTree(all){
  let types = all.types;
  let subTypes = all.subTypes;
  let subjects = all.subjects;
  let tree = "";
  for(let dType of Object.keys(types.found)){
    if(noSubTypes[node2label(dType)]){
      tree += `<b class="noSubTypes" value="${dType}">${unCamel(node2label(dType))}</b>&nbsp;&nbsp;${types.found[dType].count}`;
    }
    else {
      tree += `<b>${unCamel(node2label(dType))}</b>&nbsp;&nbsp;${types.found[dType].count}`;
    }
    tree += "<ul>";
    for(let dSubType of Object.keys(subTypes.found)){
      if(subTypes.found[dSubType].inType != dType) continue;
      let sub = dSubType;
      tree += `<li><span>${sub}</span>&nbsp;${subTypes.found[dSubType].count} </li>`;
    }
    tree += "</ul>";
  }
  tree+= `<p><b>${all.subjects.length} records</b></p>`;
  return tree;
}

export const noSubTypes = {
  Person:1,
  Specification:1,
  Ontology:1,
  Event:1,
}

export async function getTypes(){
  await loadCatalog();
  const typeNode = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
  const isa = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') ;
  const dataNode = source().dataNode;
  const subTypeNode = $rdf.sym(source().vocURL+'#'+'subType');
  const subjects = findUniqueSubjects(store,source().dataURL);
  const types = {found:{},missing:[]};
  const subTypes= {found:{},missing:[]};
  const missingNames = [];
  const knownType = findNodeShapes();
  const knownSubType = findKnownSubTypes();
  const duplicatedNames = [];
  const knownName = {}
  for(let s of subjects){
    let type = store.any(s,isa,null,dataNode);
    let subType = store.any(s,subTypeNode,null,dataNode);
    let name = findName(s);
    if(knownName[s.value]) duplicatedNames.push(s.value);
    knownName[s.value] = true;
    let tval = type ?type.value : "";
    let sval = subType ?subType.value : "";
    let tvalLabel = node2label(tval);
    let svalLabel = findPrefLabel(sval);
    if(!name){
      missingNames.push(s.value);
    }
    if(!knownType[type]){
      types.missing.push(s.value);
    }
/*
    if(!subType || !type || (!noSubTypes[tvalLabel] && !knownSubType[sval])){
      subTypes.missing.push(s.value);
    }
*/
    if(type && knownType[type]){
      types.found[type.value] ||= {};
      types.found[type.value].count ||= 0;
      types.found[type.value].count++;
    }
    if(subType && knownSubType[subType.value]){
      subTypes.found[subType.value] ||= {};
      subTypes.found[subType.value].count ||= 0;
      subTypes.found[subType.value].count++;
      subTypes.found[subType.value].inType = type.value; 
    }
  }
  return {types,subTypes,subjects:subjects,missingNames,duplicatedNames} ;
}

function reportMissing(types,subTypes,missingNames,duplicatedNames){
  let missing = "<p><b>Records with missing names</b> "+missingNames.length + "</p>";
  if(missingNames.length>0){
    missing += "<ul>";
    for(let m of missingNames) {
     missing += `<li>${m}</li>` ;
    }
    missing += "</ul>";
  }
  missing += "<p><b>Duplicated Names</b> "+duplicatedNames.length + "</p>";
  if(duplicatedNames.length>0){
    missing += "<ul>";
    for(let d of duplicatedNames) {
     missing += `<li>${d}</li>` ;
    }
    missing += "</ul>";
  }
  missing +=  "<p><b>Records with missing or unknown types</b> "+types.missing.length + "</p>";
  if(types.missing.length>0){
    missing += "<ul>";
    for(let t of types.missing) {
      missing += `<li>${t}</li>`;
    }
    missing += "</ul>";
  }
  missing += "<p><b>Records with missing or unknown subtypes</b> "+subTypes.missing.length+"</p>";
  missing += "</ul>";
  if(subTypes.missing.length>0){
    missing += "<ul>";
    for(let t of subTypes.missing) {
      missing += `<li>${t}</li>`;
    }
    missing += "</ul>";
  }
  return missing;
}
