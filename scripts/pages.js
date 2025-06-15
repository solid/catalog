import {pageContent} from '../pages/page-content.js';
import {store,fetcher,source,showPage,search,findNodeShapes} from './utils.js';

/*
  prepNewRecordForm -- displays asset classes in selector 
*/
export async function prepNewRecordForm(){
  let selector = document.getElementById('recordTypeChooser');
  let createRecordButton = document.getElementById('createRecordButton');
  let cancelButton = document.getElementById('cancelButton');
  await fetcher.load(source().shaclURL);
  // let types = findNodeShapes();
  let types = findTopTypes();
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
function findTopTypes(){
   let topType = {};
   let shape = $rdf.sym(source().shaclNode.uri+'#SolidResourceShape');
   const propertyPredicate = $rdf.sym('http://www.w3.org/ns/shacl#property');
   const collectionPredicate = $rdf.sym('http://www.w3.org/ns/shacl#in');
   let property = store.any(shape,propertyPredicate,null);
   let collection = store.any(property,collectionPredicate);
   for(let type of collection.elements){
     let label = labelFromUrl(type.value);
     topType[type.value] = label;
   }
   return topType;
}
function labelFromUrl(url){
   let label = url.replace(/^.*#/,'').replace(/^[^\/]*\//,'');
   return label.replace(/([A-Z])/g, ' $1').trim();  // separate camelcase words
}
/*
  prepRecordSearchForm -- adds listeners to search page
*/
export async function prepRecordSearchForm(){
  document.body.innerHTML = pageContent.recordSearch;  
  let searchPage = parent.document.getElementById('searchPage');
  let searchButton = document.getElementById('searchButton');
  let createNewButton = document.getElementById('createNewButton');
  let input = document.getElementById('searchForm');
  let display = document.getElementById('display');
  let iframe = parent.document.getElementById('iframeDisplay');
  const dataNode = source().dataNode;
  searchButton.addEventListener('click',async ()=>{ doSearch(input.value)  });
  createNewButton.addEventListener('click',async ()=>{ 
    showPage('type-chooser');
  });
  input.addEventListener('keydown',async (event)=>{ 
    if (event.key === 'Enter')  doSearch(input.value);  
  });
  async function doSearch(term){
    let content = await search(term);
    display.innerHTML = "";
    display.innerHTML = content;
    let anchors = display.querySelectorAll('.search-results a');
    for(let anchor of anchors){
      anchor.addEventListener('click',(e)=>{ 
        e.preventDefault();
        const node = $rdf.sym(e.target.getAttribute('href'));
        const type = store.any(node,source().isa,null,dataNode)
        showPage('record',{id:node.value,type:type.value+"Shape"});
        return false;
      });
    }
  };
}
