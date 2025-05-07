import {findFullText,loadCatalog,source,store,fetcher,showPage,node2label,findName,parseRdfCollection,findShaclName} from './utils.js';

export async function editRecord(id,area,shape) {
  return await shacl2form(shape,id,area)
}
function shapeFromId(id){
}
export async function shacl2form(shape,id,area) {
  await loadCatalog();
  area ||= 'forms-area';
  if(!shape){
    shape = (store.any($rdf.sym(id),source().isa,null,source().dataNode)||{}).value;
  }
  shape = shape.replace('>','').replace(/.*#/,'') + 'Shape';
  let shapeNode = $rdf.sym(source().shaclURL + '#' + shape);
  const mainArea = document.getElementById('main-content');
  const formsArea = document.getElementById('forms-area');
  let menubar = document.querySelector('#menubar'); 
  if(!menubar){
      menubar = document.createElement('div');
      menubar.setAttribute('id','menubar');
      formsArea.appendChild(menubar);
  }
  let form = document.querySelector('form');
  if(!form) {
    form = document.createElement('form'); 
    formsArea.appendChild(form);
  }
    form.classList.add('record');
//  clearForm(form);      
//form.innerHTML="";
//form.classList.add('formShown');
formsArea.style.display="block";
mainArea.style.display="none";

//console.log(1,shapeNode.value)
//shapeNode=$rdf.sym('http://localhost:8444/home/s/catalog/v2/catalog-shacl.ttl#LearningResourceShape');
//console.log(2,shapeNode.value)
  const properties = store.match(shapeNode, $rdf.sym('http://www.w3.org/ns/shacl#property'),null,source().shaclNode);
//  const properties = store.match(null, $rdf.sym('http://www.w3.org/ns/shacl#property'),null,source().shaclNode);
console.log(3,properties);
  createMenubar(shapeNode,id);
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
      if(datatype) field.setAttribute('datatype',datatype);
//      const fieldName = path.value.split('#')[1];
      const fieldName = findShaclName(property.object)
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
        let labelContent = fieldName;
        input.name = fieldName;
        label.classList.add('fieldLabel');
        input.classList.add('fieldValue');
        if(isRequired) labelContent += '*';
        label.innerHTML = labelContent;
        if(isRequired) label.style.color="yellow";
   
        field.appendChild(label);
        field.appendChild(input);
        field.appendChild(descField);
        form.appendChild(field);
      }
    }
  }); // end properties foreach


    function createMenubar(shape,recordURL){
      const form = document.querySelector('form.record');
//      const menubar = document.getElementById('forms-menubar'); 
      const formsAarea = document.getElementById('forms-area'); 
      let menubar = document.querySelector('#menubar'); 
      shape.value = (shape.value || shape).replace(/>/,'');
      const shapeLabel = findShaclName(shape)||"";
      let recordLabel = findName(recordURL);
      const text = recordLabel ?`Edit ${shapeLabel} - '${recordLabel}'` :`Edit new ${shapeLabel}</span>`;
      let targetNode = $rdf.sym('http://www.w3.org/ns/shacl#targetClass');
      const targetClass = store.any($rdf.sym(shape),targetNode,null,source().shaclNode);
      menubar.innerHTML = `
        <b>Solid Resources Catalog - ${text}</b>
        <span class="buttons">
          <button id="saveRecord">save</button>
          <button id="cancelButton">cancel</button>
        </span>
      `;
      let saveButton = document.getElementById('saveRecord');
      let deleteButton = document.getElementById('deleteButton');
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

        let subject = form.getAttribute('id');
        if(!subject){
            subject = source().dataURL + "#" + nameInput.value.replace(/\s+/g,'_');
        }
        let subjectLabel;
        if(subject.match(source().dataURL)){
          subjectLabel = subject.replace(source().dataURL+'#','cdata:');
        }
        else subjectLabel = `<${subject}>`;
        all += `${subjectLabel} a ex:${shapeLabel.replace(/Shape$/,'')} ;\n`;
        const fields = document.querySelectorAll('form.record .field');
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
    if(id) loadRecord(id);
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
//      const form = document.getElementById('forms-record');
      const form = document.querySelector('form.record');
      clearForm(form);      
      //      const chooser = document.getElementById('chooser'); 
      //    let subject = $rdf.sym(chooser.value);
      subject = subject.value ?subject :$rdf.sym(subject);
      form.setAttribute('id',subject.value);
      form.classList.add('record');
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
