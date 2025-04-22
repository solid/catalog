// import {shacl2form,loadRecord} from '../scripts/forms.js';
import {pageContent} from '../pages/page-content.js';

const store = UI.store;
const fetcher = $rdf.fetcher(store);

const isa = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') ;
const pathNode = $rdf.sym('http://www.w3.org/ns/shacl#path') ;

export function node2label(thing){
  let label = thing.value ?thing.value :thing;
  return label.replace(/.*\//,'').replace(/.*#/,'');
}
export function source(){
  window.currentFolder = window.location.href.replace(/\/pages\/[^\/]+$/,'/');
  return {
    dataURL   : currentFolder + 'catalog-data.ttl',
    shaclURL  : currentFolder + 'catalog-shacl.ttl',
    skosURL   : currentFolder + 'catalog-skos.ttl',
//    newDataURL    : currentFolder + 'new-data/',
    newDataURL    : 'https://solidproject.solidcommunity.net/catalog/v2/new-data/',
//    newDataURL    : 'https://jeff-zucker.solidcommunity.net/public/',
    vocURL    : 'http://example.org/',
    dataNode  : $rdf.sym(currentFolder + 'catalog-data.ttl'),
    shaclNode : $rdf.sym(currentFolder + 'catalog-shacl.ttl'),
    skosNode  : $rdf.sym(currentFolder + 'catalog-skos.ttl'),
  }
}

export function findName(store,url,dataURL){
  if(!url) return "";
  let node = url.value ?url :$rdf.sym(url);
  const dataNode  = $rdf.sym(dataURL);
  const labelNode  = $rdf.sym(source().vocURL+'#name');
  let label = store.any(node,labelNode,null,dataNode);
  label = label && label.value ?label.value :"";
  return label.replace(/.*\//,'').replace(/.*#/,'');
}
export async function prepNewRecordForm(shaclURL){
  let selector = document.getElementById('recordTypeChooser');
  let createRecordButton = document.getElementById('createRecordButton');
  let cancelButton = document.getElementById('cancelButton');
  await fetcher.load(shaclURL);
  let types = findKnownTypes(store,shaclURL);
  selector.innerHTML = "";
  for(let t  of Object.keys(types)){
    selector.innerHTML += `<option value="${t}">${types[t]}</option>`;
  }
  createRecordButton.addEventListener('click',async ()=>{ 
    showPage('record',{type:selector.value})
  });
  cancelButton.addEventListener('click',async ()=>{ 
    showPage('main')
  });

}
export async function prepRecordSearchForm(dataURL){
  document.body.innerHTML = pageContent.recordSearch;  
  let searchPage = parent.document.getElementById('searchPage');
  let searchButton = document.getElementById('searchButton');
  let createNewButton = document.getElementById('createNewButton');
  let input = document.getElementById('searchForm');
  let display = document.getElementById('display');
  let iframe = parent.document.getElementById('iframeDisplay');
  const dataNode = $rdf.sym(dataURL);
  searchButton.addEventListener('click',async ()=>{ doSearch(input.value)  });
  createNewButton.addEventListener('click',async ()=>{ 
    showPage('type-chooser');
  });
  input.addEventListener('keydown',async (event)=>{ 
    if (event.key === 'Enter')  doSearch(input.value);  
  });
  async function doSearch(term){
    let content = await search(dataURL,term);
    display.innerHTML = "";
    display.innerHTML = content;
    let anchors = display.querySelectorAll('.search-results a');
    for(let anchor of anchors){
      anchor.addEventListener('click',(e)=>{ 
        e.preventDefault();
        const node = $rdf.sym(e.target.getAttribute('href'));
        const type = store.any(node,isa,null,dataNode)
        showPage('record',{id:node.value,type:type.value});
        return false;
      });
    }
  };
}
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
    await shacl2form(o.shaclURL,o.skosURL,o.dataURL,shape,o.id);
    if(o.id) loadRecord(o.id);
  }
}


export async function search(dataURL,term){
  await fetcher.load(dataURL);
  const dataNode  = $rdf.sym(dataURL);
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
export async function report(dataURL,shaclURL,skosURL,shape){
  await loadCatalog(fetcher,dataURL,shaclURL,skosURL);
  const typeNode = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
  const dataNode = $rdf.sym(dataURL);
  const isa = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') ;
  const subTypeNode = $rdf.sym(source().vocURL+'#'+'subType');
  const subjects = findUniqueSubjects(store,dataURL);
  const types = {found:{},missing:[]};
  const subTypes= {found:{},missing:[]};
  const knownType = findKnownTypes(store,shaclURL);
  const knownSubType = findKnownSubTypes(store,skosURL);
  for(let s of subjects){
    let type = store.any(s,isa,null,dataNode);
    let subType = store.any(s,subTypeNode,null,dataNode);
    let tval = type ?type.value : "";
    let sval = subType ?subType.value : "";
    if(!knownType[tval]){
      types.missing.push(s.value);
    }
    if(!type.value.match('Person') && !knownSubType[sval]){
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
    report += "<li><b>"+dType.replace(source().vocURL+'#','') + "</b>&nbsp;&nbsp;"+types.found[dType].count + "</li>";
    report += "<ul>";
    for(let dSubType of Object.keys(subTypes.found)){
      if(subTypes.found[dSubType].inType != dType) continue;
      report += "<li>" + dSubType.replace(skosURL+'#','') + "&nbsp;"+subTypes.found[dSubType].count + "</li>";
    }
    report += "</ul>";
  }
  report += "<li><b>Types missing or unknown</b> "+types.missing.length + "</b></li>";
  report += "<li><b>Sub-Types missing or unknown "+subTypes.missing.length+"</b></li>";
  report += "</ul>";
  if(types.missing.length>0){
    report +="<div><b>Records missing Types</b></div>";
    for(let t of types.missing) { report += "&nbsp;&nbsp;"+t.replace(dataURL+'#','')+"<br>" }
  }
  if(subTypes.missing.length>0){
    report +="<div><b>Records missing Sub-Types</b></div>";
    for(let t of subTypes.missing) { report += "&nbsp;&nbsp;"+t.replace(dataURL+'#','')+"<br>" }
  }
  return report;
}

export function findKnownTypes(store,shaclURL){
  const shaclNode =$rdf.sym(shaclURL);
  const shapeNode = $rdf.sym('http://www.w3.org/ns/shacl#NodeShape');
  let types = store.each(null,isa,shapeNode,shaclNode);
  let knownType = {} ;
  for(let t of types){
    knownType[t.value] = t.value.replace(/.*#/,'').replace(/.*\//,'');
  }
  return knownType;
}
export function findKnownSubTypes(store,skosURL){
  const skosNode =$rdf.sym(skosURL);
  let subTypes = store.match(null,null,null,skosNode);
  let knownSubType = {} ;
  for(let t of subTypes){
    knownSubType[t.subject.value] = 1;
  }
  return knownSubType;
}
export async function loadCatalog(fetcher,shaclURL,skosURL,dataURL) {
  try{
    await fetcher.load(shaclURL);
    await fetcher.load(skosURL);
    await fetcher.load(dataURL);
  }
  catch(e){console.log(e);}
}
export function findUniqueSubjects(store,dataURL){
  const subjects = [];
  const isSubject = {}
  const notUnique = store.match(null,null,null,$rdf.sym(dataURL));
  for(let s of notUnique){
    if(isSubject[s.subject.value]) continue;
    isSubject[s.subject.value] = true;
    subjects.push(s.subject);
  }
  return subjects;
}

/*============================*/

export async function shacl2form(shaclURL,skosURL,dataURL,shape,id) {
  await loadCatalog(fetcher,shaclURL,skosURL,dataURL);
  const form = document.getElementById('shacl2form');
  clearForm(form);      
//  const shapeNode = $rdf.sym(dataURL + '#' + shape);
  const shapeNode = $rdf.sym(source().vocURL + '#' + shape);
  const properties = store.match(shapeNode, $rdf.sym('http://www.w3.org/ns/shacl#property',null,$rdf.sym(shaclURL)));

  createMenubar(shape,id,dataURL);
//  populateRecordsDropdown(dataURL,shape);

  properties.forEach( property => {
    const path = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#path'));
    const minCount = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#minCount'))||{value:0};
    const maxCount = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#maxCount'))||{value:0};
    const isRequired = minCount.value==1 && maxCount.value==1;
    const length = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#maxLength'));
    let datatype = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#datatype'));
    let desc = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#description'));
    let descField = document.createElement('span');
    descField.innerHTML = desc ?desc.value :"";
    descField.classList.add('fieldDescription');
    datatype = datatype ?datatype.value :'http://www.w3.org/2001/XMLSchema#anyURI';
    const orCollectionStart = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#or'));
    let field = document.createElement('div');
    field.classList.add('field');
    if (path) {
      field.setAttribute('id',path.value);
//      field.setAttribute('path',path.value);
      if(datatype) field.setAttribute('datatype',datatype);
      const fieldName = path.value.split('#')[1];
      let label = document.createElement('span');
      label.innerHTML = fieldName;
      label.classList.add('fieldLabel');
      if (orCollectionStart) {
        const select = document.createElement('select');
        select.name = fieldName;
        select.innerHTML =  parseRdfCollection(orCollectionStart);
        select.classList.add('fieldValue');
        field.appendChild(label);
        field.appendChild(select);
        field.appendChild(descField);
        form.appendChild(field);
      }
      else if (datatype) {
        let label = document.createElement('span');
        let input;
        if(length && length.value > 80){
          input = document.createElement('textarea');
        }
        else {
          input = document.createElement('input');
          datatype = datatype.match(/#/) ?datatype.split('#')[1] :datatype.replace(/.*\//,'') ;
          input.type = datatype === 'string' ? 'text' : 'url';
        }
        input.name = label.innerHTML = fieldName;
        label.classList.add('fieldLabel');
        input.classList.add('fieldValue');
        if(isRequired) label.innerHTML += `<b style="color:red">*</b>`;
        field.appendChild(label);
        field.appendChild(input);
        field.appendChild(descField);
        form.appendChild(field);
      }
    }
  }); // end properties foreach


    function parseRdfCollection(collectionNode) {
      const entries = collectionNode.elements;
      const concepts = [];
      for(var subject of entries){
        let concept = store.any( subject, $rdf.sym('http://www.w3.org/2004/02/skos/core#preflabel') );
        if(concept) concepts.push(`<option value="${subject.value}">${concept.value}</option>`);
      }
      return concepts;
    }
    function createMenubar(shape,recordURL,dataURL){
      const form = document.getElementsByTagName('form')[0];
      const menubar = document.getElementById('menubar'); 
      const shapeLabel = node2label(shape);
      let recordLabel = findName(store,recordURL,dataURL);
      const text = recordLabel ?`Edit ${shapeLabel} - '${recordLabel}'` :`Edit new ${shapeLabel}</span>`;
      menubar.innerHTML = `<span>Solid Resources Catalog - ${text}`;
      menubar.innerHTML += `
        <span class="menubar">
        <button id="saveRecord">save</button>
        <button id="cancelButton">cancel</button>
      `;
      let saveButton = document.getElementById('saveRecord');
      let cancelButton = document.getElementById('cancelButton');
      saveButton.addEventListener('click', async function() {
        let all = `
@prefix cdata: <${source().dataURL}#> .
@prefix ex: <${source().vocURL}#> .
@prefix con: <${source().skosURL}#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

`;
      let nameInput = form.querySelector('[name=name]');
      let description = form.querySelector('[name=description]');
      if(!nameInput.value) {
        alert("ERROR: You must enter a name!");
        return;
      }
      if(!description.value) {
        alert("ERROR: You must enter a description!");
        return;
      }
        let subject = form.getAttribute('id');
        if(!subject){
          subject = dataURL + "#" + nameInput.value.replace(/\s+/g,'_');
        }
        let subjectLabel;
        if(subject.match(dataURL)){
          subjectLabel = subject.replace(source().dataURL+'#','cdata:');
        }
        else subjectLabel = `<${subject}>`;
        all += `${subjectLabel} a ex:${shape} ;\n`;
        const fields = document.querySelectorAll('.field');
        for(let field of fields){
          let input = field.querySelector('input') || field.querySelector('textarea') || field.querySelector('select');
          let object = input.value;
          let predicate = field.getAttribute('id');
          const type = field.getAttribute('datatype');
          if(object.length == 0) continue;
          if(predicate.match(source().vocURL)){
            predicate = predicate.replace(source().vocURL+'#','ex:');
          }
          else predicate = `<${predicate}>`;
          if(type.match(/anyURI/)){
            if(object.match(source().skosURL)){
              object = object.replace(source().skosURL+'#','con:');
            }
            else object = `<${object}>`;
          }
          else  {
            object = `"""${object.trim()}"""@en`;
          }
          all += `    ${predicate}  ${object} ;\n`;
        }
        const dateLabel = new Date().toISOString();
        all = all + `    ex:modified "${new Date().toISOString()}"^^xsd:dateTime .\n\n`;
        console.log(all)
        if(!recordLabel){
          recordLabel = document.querySelector('[name=name]').value;
        }
        let url = source().newDataURL + encodeURIComponent(dateLabel+'-'+recordLabel.replace(/\s+/g,'_'))+'.ttl';
        try {
          let r = await fetcher._fetch( url, {
            contentType: 'text/turtle',
            method:'PUT',
            headers: {
              'Content-Type': 'text/turtle',
            },
            body: all,
          });
           showPage( 'main' );
           alert("File saved!")
          }catch(e){alert(e)}
       });       
       cancelButton.addEventListener('click', function() {
        showPage( 'main' );
      });
    }

} // end shacl2form function

    function clearForm(form){
      form.setAttribute('id',"");
      let fields = Array.from( form.getElementsByTagName('input') );
      for(let f of fields) { f.value = ""; }
      fields =  Array.from( form.getElementsByTagName('textarea') );
      for(let f of fields) { f.value = ""; }
      const selects = form.getElementsByTagName('select');
      for(let s of selects) { s.selectedIndex = 0; }
    }

    export function loadRecord(subject){
      const form = document.getElementsByTagName('form')[0];
      clearForm(form);      
      //      const chooser = document.getElementById('chooser'); 
      //    let subject = $rdf.sym(chooser.value);
      subject = subject.value ?subject :$rdf.sym(subject);
      form.setAttribute('id',subject.value);
      let record = store.match(subject);
      for(let field of record){
        let predicate = field.predicate.value;
        if(predicate.match("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")) continue;
        let value = field.object.value;
        let valueLabel = store.each(field.subject,field.predicate);
        if(valueLabel.length > 1){
          let v = [];
          for(let va of valueLabel) v.push(va.value);
            valueLabel = v.join(',');
        }
        else {
          valueLabel = valueLabel[0] ?valueLabel[0].value : "";
        }
        let element = document.getElementById(predicate);
        let input;
        if(element) input = element.getElementsByTagName('input')[0] || element.getElementsByTagName('textarea')[0] || element.getElementsByTagName('select')[0];
        if(input){
            let newValue = valueLabel.replace(new RegExp(source().dataURL+'#', 'g'), '').replace(/\s+/g,' ').trim();
//          let newValue = node2label(valueLabel);
	  input.value = input.tagName==='SELECT' ?value :newValue;
          input.value = input.value.trim();
        }
      }
    }

/*

@prefix cdata: <http://localhost:8444/home/s/catalog/v2/catalog-data.ttl#> .
@prefix ex: <http://example.org/#> .
@prefix con: <http://localhost:8444/home/s/catalog/v2/catalog-skos.ttl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

cdata:InruptPodSpaces a ex:Service ;
    ex:name  """Inrupt Pod Spaces"""@en ;
    ex:subType  con:GeneralPurposePodService ;
    ex:status  con:Exploration ;
    ex:description  """Inrupt Pod Spaces is an instance of the Enterprise Solid Server provided by Inrupt, Inc., hosted by Amazon."""@en ;
    ex:provider  """Inrupt"""@en ;
    ex:serviceBackend  """ESS"""@en ;
    ex:modified "2025-04-21T15:32:54.676Z"^^xsd:dateTime .

*/
