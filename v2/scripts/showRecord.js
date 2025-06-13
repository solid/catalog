import {findRecord,findPrefLabel,source} from './utils.js';
import {editRecord} from './form.js';
import {showRecordsByKeyword} from './viewer.js';

export function showRecord(display,subject,record){
  record ||= findRecord(subject);
  let div = document.createElement('div');
  div.classList.add('record');
  display.innerHTML="";
  display.appendChild(div);
  let dependencyStr = "";
  let str = makeRecordHeader(subject,record);
  for(let f of Object.keys(record)){
    if( recordDisplayFieldsToSkip(f) ) continue;
    if(f=="contactEmail") str += recordDisplayEmail(f,record[f]);
    else if(f.match(/softwareStackIncludesOf|hasDependencyOnOf|hasDependencyOn/)){
      dependencyStr += recordDisplaySoftwareRelations(f,record[f]);
    }
    else str += recordDisplayMakeDiv(f,record[f]);
  }
  str += recordDisplayLinks(record);
  div.innerHTML = str + dependencyStr;
  addRecordListeners(display);
}

function makeRecordHeader(subject,record){
  let displayType = [] ;
  let type = record.subType ;
  for(let d of type){
    displayType.push( findPrefLabel( d ) );
  }
  displayType = displayType.join(', ');
  console.log(displayType)
  let str = `
      <div class="edit-row"><a class="edit-button" href="${subject}">edit</a></div>
      <div><b class="record-name">${record.name}</b></div><div>${displayType}</div>`
  if(record.socialKeyword||record.technicalKeyword){
    str += `<div class="keywords">keywords: `;
    str += (record.socialKeyword || "") + (record.technicalKeyword ||"");
    str += `</div>`;
  }
  str += `</p><p>${record.description||""}</p>`;
  if(record.logo) str+= `<img src="${record.logo}" alt="logo">`;
  return str;
}
function recordDisplayLinks(record){
  let s = `<p class="record-links">`;
  if(record.webid) s += `<a href="${record.webid}" target="_BLANK">WebID profile</a>`;
  if(record.repository) s += `<a href="${record.repository}" target="_BLANK">Repository</a>`;
  if(record.videoCallPage) s += `<a href="${record.videoCallPage}" target="_BLANK">Video Call Link</a>`;
  if(record.showcase) s += `<a href="${record.showcase}" target="_BLANK">Live Demo/WebApp</a>`;
  if(record.serviceEndpoint) s += `<a href="${record.serviceEndpoint}" target="_BLANK">Service Endpoint</a>`;
  if(record.landingPage) s += `<a href="${record.landingPage}" target="_BLANK">Landing Page</a>`;
  return s + '</p>';
}
function recordDisplaySoftwareRelations(label,value){
  label = label.replace(/softwareStackIncludesOf/,'is used by');
  label = label.replace(/hasDependencyOnOf/,'is dependency of');
  label = label.replace(/hasDependencyOn/,'has dependency on');
  return recordDisplayMakeDiv(label,value)
}
function recordDisplayEmail(label,value){
  let val = (value.match(/^mailto:/)) ?value :`mailto:${value}`
  val = `<a href="${val}" target="_BLANK">${val}</a>`;
  return recordDisplayMakeDiv("contact email",val)
}
function recordDisplayMakeDiv(label,value){
  return `
    <div class="field">
      <b class="fieldName">${label}</b> <span class="fieldValue">${value}</span>
    </div>
  `;
}
function recordDisplayFieldsToSkip(label){
    return label.match(/(name|subType|type|description|keyword|landingPage|serviceEndpoint|socialKeyword|technicalKeyword|webid|clientid|videoCallPage|repository|logo|showcase)/i);
}
function addRecordListeners(display){

  /* field link listeners  */
  let fieldAnchors = display.querySelectorAll('.field a');
  for(let fa of fieldAnchors){
    fa.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecord(display,e.target.getAttribute('href'));
    });
  }
  /* keyword listeners */
  let keyAnchors = display.querySelectorAll('.keywords a');
  for(let ka of keyAnchors){
    ka.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecordsByKeyword(e.target.getAttribute('href'));
    });
  }
  /* edit button listener  */
  let button = display.querySelector('.edit-button');
  button.addEventListener('click',(e)=> {
    e.preventDefault();
    editRecord(e.target.getAttribute('href'));
  });
  const images = display.querySelectorAll('img');
  images.forEach(img => {
    img.onerror = function() {
      this.style.display="none";
    };
  });
}

