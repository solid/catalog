import {getTypes,noSubTypes,makeTypesTree} from './report.js';
import {editRecord} from './form.js';
import {findFullText,findKeywords,findRecord,findPrefLabel,findName,findTechKeywords,findRecordsByType,findRecordsBySubtype,findRecordsByKeyword,showPage} from './utils.js';

function addListeners(){
    let searchInput = document.querySelector(".search-input input");
    let searchButton = document.querySelector(".search-button");
    let keyIndexButton = document.querySelector(".keyword-index-button");
    let newButton = document.querySelector(".new-record-button");
    let aboutButton = document.querySelector(".about-button");
    searchButton.addEventListener('click',(e)=>{
      e.preventDefault();
      showSearchResults(searchInput.value); 
   });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        showSearchResults(searchInput.value);
      }
    });
    keyIndexButton.addEventListener('click',(e)=>{
      e.preventDefault();
      showKeywordIndex();
    });
    newButton.addEventListener('click',(e)=>{
      e.preventDefault();
      showPage('type-chooser');
    });
    aboutButton.addEventListener('click',(e)=>{
      e.preventDefault();
      showHelp();
    });
}
function showHelp(){
  let main = document.getElementById('main-content');
  let help = document.getElementById('help');
  document.body.classList = [];
  document.body.classList.add('showHelp');
}
function hideHelp(){
  let main = document.getElementById('main-content');
  let help = document.getElementById('help');
  document.body.classList = [];
  document.body.classList.add('noHelp');
}
function readSearchParams(){
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get('search');  
  if(searchTerm) showSearchResults(searchTerm);
}
function showSearchResults(term){
  let results = findFullText(term);
  const display = document.getElementById('right-top');
  const linkDisplay = document.getElementById('right-bottom');
  linkDisplay.innerHTML="";
  display.innerHTML="";
  let div = document.createElement('div');
  div.classList.add('types');
  let str = `<p class="link-head"><b>Search results for '${term}'</b></p>`;
  for(let r of results){
    str += `<a class="link" href="${r.link}">${r.label}</a>`;
  }
  div.innerHTML = str;
  display.appendChild(div);
  for(let a of div.querySelectorAll('a')){
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      showRecord(e.target.getAttribute('href'));
    });
  }
}

export async function viewer(){
  let all = await getTypes();
  let tree = makeTypesTree(all);
  document.getElementById('left-column').innerHTML = tree;
  let anchors = document.querySelectorAll('.noSubTypes');
  for(let anchorWrapper of anchors){
    let label = anchorWrapper.innerHTML;
    let type = anchorWrapper.getAttribute('value');
    anchorWrapper.innerHTML = `<a href="javascript:findType('${type}')">${label}</a>`;
    anchorWrapper.innerHTML = `<a href="#")">${label}</a>`;
    anchorWrapper.addEventListener('click', (e)=>{showFoundTypes(e,all,type,label)});
  }
  let subAnchors = document.querySelectorAll('li span');
  const target = ' target="#center-column"';
  for(let span of subAnchors){
    let subType = span.innerHTML;
    let label = findPrefLabel(subType).replace(/\(.*/,'').trim(); //*
    if(hasKeywords[label]){
      span.innerHTML = `<a href="#")">${label}</a>`;
      span.addEventListener('click', (e)=>{showFoundKeywords(e,all,subType,label)});
    }
    else {
      span.innerHTML = `<a href="#")">${label}</a>`;
      span.addEventListener('click', (e)=>{e.preventDefault();showFoundSubTypes(e,all,subType,label)});
    }
  }
  addListeners();
  readSearchParams();
}

function showFoundTypes(event,all,type,label){
  event.preventDefault();
  let records = findRecordsByType(type);
  const display = document.getElementById('right-top');
  const linkDisplay = document.getElementById('right-bottom');
  linkDisplay.innerHTML="";
  display.innerHTML="";
  let div = document.createElement('div');
  div.classList.add('types');
  let str = `<p class="link-head"><b>${label}</b></p>`;
  for(let r of records){
    let name = findName(r);
    str += `<a class="link" href="${r.value}">${name}</a>`;
  }
  div.innerHTML = str;
  display.appendChild(div);
  for(let a of div.querySelectorAll('a')){
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      showRecord(e.target.getAttribute('href'));
    });
  }
}

function showFoundSubTypes(event,all,subtype,label){
  event.preventDefault();
  let records = findRecordsBySubtype(subtype);
  const linkDisplay = document.getElementById('right-top');
  const recordDisplay = document.getElementById('right-bottom');
  linkDisplay.innerHTML="";
  recordDisplay.innerHTML="";
  let div=document.createElement('div');
  let str = `<p class="link-head"><b>${label}</b></p>`;
  for(let r of records){
    str += `<a class="link" href="${r.value}">${findName(r)}</a>`;
  }
  div.innerHTML = str;
  linkDisplay.appendChild(div);
  for(let a of div.querySelectorAll('a')){
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      let href = e.target.getAttribute('href');
      showRecord(href);
    });
  }
}
function showRecord(subject){
  let record = findRecord(subject);
  const display = document.getElementById('right-bottom');
  display.innerHTML="";
  let displayType = record.subType || record.type ;
  let article = displayType.match(/^(a|e|i|o|u|n)/i) ?"an" : "a";
  let div = document.createElement('div');
  div.classList.add('record');
  display.appendChild(div);
  let str = `
      <p class="edit-row"><a class="edit-button" href="${subject}">edit</a></p>
      <p><b class="record-name">${record.name}</b><br>${article} ${displayType.replace(/\(.*$/,'')}</p>
    <p>${record.description||""}</p>
  `;
  for(let f of Object.keys(record)){
    if(f==="name" || f.match(/(type|description|keyword|landingPage|serviceEndpoint|socialKeyword|technicalKeyword|webid|clientid|videoCallPage|repository)/i)) continue;
    str += `
      <div class="field">
        <b class="fieldName">${f}</b> <span class="fieldValue">${record[f]}</span>
      </div>
    `;
  }
  let s = `<p class="record-links">`;
  if(record.webid) s += `<a href="${record.webid}" target="_BLANK">WebID profile</a>`;
  if(record.repository) s += `<a href="${record.repository}" target="_BLANK">Repository</a>`;
  if(record.videoCallPage) s += `<a href="${record.videoCallPage}" target="_BLANK">Video Call Link</a>`;
  if(record.serviceEndpoint) s += `<a href="${record.serviceEndpoint}" target="_BLANK">Service Endpoint</a>`;
  if(record.landingPage) s += `<a href="${record.landingPage}" target="_BLANK">Landing Page</a>`;
  s += '</p>';
  str += s;
  if(record.socialKeyword||record.technicalKeyword){
    str += `<p class="keywords">`;
    str += (record.socialKeyword || "") + (record.technicalKeyword ||"");
    str += `</p>`;
  }
  div.innerHTML = str;
  /*
    field link listeners
  */
  let fieldAnchors = display.querySelectorAll('.field a');
  for(let fa of fieldAnchors){
    fa.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecord(e.target.getAttribute('href'));
    });
  }
  /*
    keyword listeners
  */
  let keyAnchors = display.querySelectorAll('.keywords a');
  for(let ka of keyAnchors){
    ka.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecordsByKeyword(e.target.getAttribute('href'));
    });
  }
  /*
    edit button listener
  */
  let button = display.querySelector('.edit-button');
  button.addEventListener('click',(e)=> {
    e.preventDefault();
    editRecord(e.target.getAttribute('href'));
  });
}
function showFoundKeywords(event,all,subtype,label){
  event.preventDefault();
  let keys = findTechKeywords(subtype);
  const display = document.getElementById('center-column');
  document.getElementById('right-column').innerHTML="";
  display.innerHTML = `<b>${label}</b><ul>`;
  for(let k of keys){
    let newItem = document.createElement('li');
    let newLink = document.createElement('a');
    newItem.appendChild(newLink);
    display.appendChild(newItem);
    newLink.innerHTML = k;
    newLink.setAttribute('href','#');
    newLink.addEventListener('click', (e)=>{showRecordsByKeyword(e,all,k)});
  }
}
function showRecordsByKeyword(keyword){
  let records = findRecordsByKeyword(keyword);
  const recordDisplay = document.getElementById('right-bottom');
  const linkDisplay = document.getElementById('right-top');
  recordDisplay.innerHTML="";
  linkDisplay.innerHTML="";
  let str = `<p><b>Records matching '${keyword}'</b></p>`;
  for(let r of records){
    str += `<a href="${r.link}" class="link">${r.label}</a>`;
  }
  linkDisplay.innerHTML = str;
  let keyAnchors = linkDisplay.querySelectorAll('a');
  for(let ka of keyAnchors){
    ka.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecord(e.target.getAttribute('href'));
    });
  }
}
function showKeywordIndex(){
  let keywords = findKeywords();
  const recordDisplay = document.getElementById('right-bottom');
  const linkDisplay = document.getElementById('right-top');
  recordDisplay.innerHTML="";
  linkDisplay.innerHTML="";
  let str = `<p><b>Keyword Index</b></p>`;
  for(let k of keywords){
    str += `<a href="${k}" class="link">${k}</a>`;
  }
  linkDisplay.innerHTML = str;
  let keyAnchors = linkDisplay.querySelectorAll('a');
  for(let ka of keyAnchors){
    ka.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecordsByKeyword(e.target.getAttribute('href'));
    });
  }
}
const hasKeywords = {
  "Development Tool":1,
  Application:1,
}
