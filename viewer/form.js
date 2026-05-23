import {findFullText,loadCatalog,source,store,fetcher,showPage,node2label,findName,parseRdfCollection,findShaclName} from './utils.js';
import {saveDraft, deleteDraft} from './drafts.js';
import {recordEditRequest} from './editRequests.js';
import {notify, notifyError, notifySuccess, toast} from './notify.js';

export async function editRecord(id,area,shape) {
  return await shacl2form(shape,id,area)
}
function shapeFromId(id){
}
export async function shacl2form(shape,id,area) {
//  await loadCatalog();
  area ||= 'forms-area';
  if(!shape){
    shape = (store.any($rdf.sym(id),source().isa)||{}).value;
  }
  shape = shape.replace('>','').replace(/.*#/,'') + 'Shape';
  let shapeNode = $rdf.sym(source().shaclURL + '#' + shape);
//  let shapeNode = $rdf.sym('urn:x-base:default#' + shape);
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
//shapeNode=$rdf.sym('http://localhost:8444/home/s/catalog/catalog-shacl.ttl#LearningResourceShape');

  const properties = store.match(shapeNode, $rdf.sym('http://www.w3.org/ns/shacl#property'));
//  const properties = store.match(null, $rdf.sym('http://www.w3.org/ns/shacl#property'),null,source().shaclNode);
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
    datatype = datatype ?datatype.value :'http://www.w3.org/ns/shacl#IRI';
    const orCollectionStart = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#in'));
/*JZ
    const orCollectionStart = store.any(property.object, $rdf.sym('http://www.w3.org/ns/shacl#or'));
    datatype = datatype ?datatype.value :'http://www.w3.org/2001/XMLSchema#anyURI';
*/

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
      const targetClass = store.any($rdf.sym(shape),targetNode);
      menubar.innerHTML = `
        <b>Solid Resources Catalog - ${text}</b>
        <span class="buttons">
          <button id="saveRecord">publish</button>
          <button id="saveDraftBtn" type="button">save as draft</button>
        </span>
      `;
      let saveButton = document.getElementById('saveRecord');
      let deleteButton = document.getElementById('deleteButton');
      let saveDraftButton = document.getElementById('saveDraftBtn');
      saveDraftButton.addEventListener('click', () => {
        const draft = collectDraftFromForm(shape, shapeLabel, recordURL);
        const nameVal = Object.entries(draft.fields).find(([k]) => k.toLowerCase() === 'name')?.[1];
        if(!nameVal){
          notify({ title: 'Name required', body: 'Give the draft a name first.', variant: 'error' });
          return;
        }
        const opts = window._currentDraftOpts || {};
        if(opts.draftId) draft.id = opts.draftId;
        saveDraft(draft);
        window._currentDraftOpts = null;
        showPage('main');
        toast('Saved as draft', { variant: 'success' });
      });
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
        notify({ title: 'Name required', body: 'You must enter a name before publishing.', variant: 'error' });
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
/*JZ*/    if(type.match(/(IRI|anyURI)/)){
            if(object.match(source().skosURL)){
              object = object.replace(source().skosURL+'#','con:');
            }
            else object = `<${object}>`;
          }
          else  {
            object = `"""${object.trim()}"""`;
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
        console.log(url);
        try {
          let r = await fetcher._fetch( url, {
            contentType: 'text/turtle',
            method:'PUT',
            headers: {
              'Content-Type': 'text/turtle',
            },
            body: all,
          });
           const opts = window._currentDraftOpts || {};
           if(opts.draftId) deleteDraft(opts.draftId);
           window._currentDraftOpts = null;
           const fieldsSnapshot = collectDraftFromForm(shape, shapeLabel, recordURL).fields;
           recordEditRequest({
             kind: recordURL ? 'edit' : 'create',
             shape: (typeof shape === 'string' ? shape : shape?.value || '').replace(/.*#/,'').replace(/Shape$/, ''),
             shapeLabel,
             subject: subject,
             name: fieldsSnapshot.name || nameInput.value,
             targetUrl: url,
             body: all,
             fields: fieldsSnapshot,
           });
           showPage( 'main' );
           notifySuccess('Edits will not be immediately incorporated in the live data, but your record is saved.', 'File saved');
          }catch(e){ notifyError(e?.message || String(e), 'Could not save'); }
       });       
    }
    if(id) loadRecord(id);
} // end shacl2form function

function normalizeFieldName(s){
  return (s || '').replace(/\*/g,'').trim();
}
export function collectDraftFromForm(shape, shapeLabel, recordURL){
  const fields = {};
  for(const fieldEl of document.querySelectorAll('form.record .field')){
    const labelEl = fieldEl.querySelector('.fieldLabel');
    const input = fieldEl.querySelector('input,textarea,select');
    if(!labelEl || !input) continue;
    const name = normalizeFieldName(labelEl.textContent);
    if(input.value) fields[name] = input.value;
  }
  // shacl2form will append "Shape" to whatever we give it, so store the
  // unsuffixed base name (e.g. "CreativeWork").
  const shapeName = (typeof shape === 'string' ? shape : (shape?.value || ''))
    .replace(/.*#/,'')
    .replace(/Shape$/,'');
  return {
    shape: shapeName,
    shapeLabel,
    recordURL: recordURL || null,
    fields,
  };
}

export function applyDraftToForm(draft, retries = 20){
  if(!draft) return;
  const tryFill = () => {
    const fieldEls = document.querySelectorAll('form.record .field');
    if(!fieldEls.length){
      if(retries-- > 0) return setTimeout(tryFill, 100);
      return;
    }
    for(const fieldEl of fieldEls){
      const labelEl = fieldEl.querySelector('.fieldLabel');
      const input = fieldEl.querySelector('input,textarea,select');
      if(!labelEl || !input) continue;
      const name = normalizeFieldName(labelEl.textContent);
      if(draft.fields && draft.fields[name] != null){
        input.value = draft.fields[name];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };
  tryFill();
}

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
console.log(valueLabel,9,newValue);
//          let newValue = node2label(valueLabel);
	  input.value = input.tagName==='SELECT' ?value :newValue;
          input.value = input.value.trim();
        }
      }
    }
