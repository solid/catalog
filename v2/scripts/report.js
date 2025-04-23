import {rdf,store,fetcher,loadCatalog,source,findUniqueSubjects,findNodeShapes,findKnownSubTypes,node2label} from './utils.js'
const $rdf=rdf;

export async function report(){
  await loadCatalog();
  const typeNode = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
  const dataNode = source().dataNode;
  const isa = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') ;
  const subTypeNode = $rdf.sym(source().vocURL+'#'+'subType');
  const subjects = findUniqueSubjects(store,source().dataURL);
  const types = {found:{},missing:[]};
  const subTypes= {found:{},missing:[]};
  const knownType = findNodeShapes();
  const knownSubType = findKnownSubTypes();
  for(let s of subjects){
    let type = store.any(s,isa,null,dataNode);
    let subType = store.any(s,subTypeNode,null,dataNode);
    let tval = type ?type.value : "";
    let sval = subType ?subType.value : "";
    if(!knownType[tval]){
      types.missing.push(s.value);
    }
    if(!type || (!type.value.match(/Person|Specification|Ontology|Event/) && !knownSubType[sval])){
      subTypes.missing.push(s.value);
    }
    if(type && knownType[type.value]){
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
  let report = "<b>Solid Resources Catalog Report</b> (" +  new Date().toLocaleDateString() +") " + subjects.length+" records\n<ul>";
  for(let dType of Object.keys(types.found)){
      report += "<li><b>"+node2label(dType) + "</b>&nbsp;&nbsp;"+types.found[dType].count + "</li>";
//      report += "<li><b>"+node2label(dType).replace(source().vocURL+'#','') + "</b>&nbsp;&nbsp;"+types.found[dType].count + "</li>";
    report += "<ul>";
    for(let dSubType of Object.keys(subTypes.found)){
      if(subTypes.found[dSubType].inType != dType) continue;
	       report += "<li>" + dSubType.replace(source().skosURL+'#','') + "&nbsp;"+subTypes.found[dSubType].count + "</li>";
//	console.log(33,dSubType,findPrefLabel(dSubType))
//	report += "<li>" + findPrefLabel(dSubType) + "&nbsp;"+subTypes.found[dSubType].count + "</li>";
    }
    report += "</ul>";
  }
  report += "</ul><ul><li><b>Types missing or unknown</b> "+types.missing.length + "</b></li>";
  report += "<li><b>Sub-Types missing or unknown "+subTypes.missing.length+"</b></li>";
  report += "</ul>";
  if(types.missing.length>0){
    report +="<div><b>Records missing Types</b></div>";
    for(let t of types.missing) { report += "&nbsp;&nbsp;"+t.replace(dataURL+'#','')+"<br>" }
  }
  if(subTypes.missing.length>0){
    report +="<div><b>Records missing Sub-Types</b></div>";
      for(let t of subTypes.missing) { report += "&nbsp;&nbsp;"+t.replace(source().dataURL+'#','')+"<br>" }
  }
  return report;
}
