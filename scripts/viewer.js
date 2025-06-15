import {showRecord} from './showRecord.js';
import {makeTOC} from './makeTOC.js';
import {findFullText,findKeywords,findRecord,findRecordsBySubtype,findName,findRecordsByKeyword,showPage} from './utils.js';

export async function viewer(){
  await makeTOC( document.getElementById('left-column') );
  addListeners();
  readSearchParams();
}
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
  document.body.classList.remove('noHelp');
  document.body.classList.add('showHelp');
  help.style.display="block";
}
function hideHelp(){
  let main = document.getElementById('main-content');
  let help = document.getElementById('help');
  main.style.display="block";
  help.style.display="none";
  document.body.classList.remove('showHelp');
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
      findAndShowRecord( e.target.getAttribute('href') );
    });
  }
}
export function showRecordsByKeyword(keyword){
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
      findAndShowRecord(e.target.getAttribute('href'));
    });
  }
}
function findAndShowRecord(subject){
  let record = findRecord(subject);
  showRecord(  document.getElementById('right-bottom'), subject,record);
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
export function showSubtypes(subtype,label){
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
      findAndShowRecord( href );
    });
  }
}


