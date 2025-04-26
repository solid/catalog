import {loadCatalog,source,store,fetcher,showPage,node2label,findName,parseRdfCollection} from './utils.js';

export async function shacl2form(shape,id) {
  await loadCatalog();
  const form = document.getElementById('shacl2form');
  clearForm(form);      
//  const shapeNode = $rdf.sym(dataURL + '#' + shape);
  const shapeNode = $rdf.sym(source().vocURL + '#' + shape);
    const properties = store.match(shapeNode, $rdf.sym('http://www.w3.org/ns/shacl#property',null,source().shaclNode));

    createMenubar(shape,id);
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


    function createMenubar(shape,recordURL){
      const form = document.getElementsByTagName('form')[0];
      const menubar = document.getElementById('menubar'); 
      const shapeLabel = node2label(shape);
      let recordLabel = findName(recordURL);
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

        let subject = form.getAttribute('id');
        if(!subject){
            subject = source().dataURL + "#" + nameInput.value.replace(/\s+/g,'_');
        }
        let subjectLabel;
        if(subject.match(source().dataURL)){
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
