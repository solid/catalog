// Overlay handling: optionally merge un-published changes (mine, from local
// edit-requests / drafts; and other people's, from the public submissions LDP
// container) into the live catalog rdflib store so they appear in card grids
// alongside published records.

import { listEditRequests } from './editRequests.js';
import { fetchPublishLog, fetchSubmission } from './submissionLog.js';

const MINE_KEY = 'catalog.showMineOverlay';
const OTHERS_KEY = 'catalog.showOthersOverlay';
const mergedUrls = new Set();   // submissions we've already parsed into the store
const mergedMineIds = new Set(); // local edit-request ids we've already parsed

export function getShowMine(){ return localStorage.getItem(MINE_KEY) === '1'; }
export function getShowOthers(){ return localStorage.getItem(OTHERS_KEY) === '1'; }
export function setShowMine(v){
  if(v) localStorage.setItem(MINE_KEY, '1'); else localStorage.removeItem(MINE_KEY);
  refreshOverlays().then(()=> emit());
}
export function setShowOthers(v){
  if(v) localStorage.setItem(OTHERS_KEY, '1'); else localStorage.removeItem(OTHERS_KEY);
  refreshOverlays().then(()=> emit());
}

function emit(){
  document.dispatchEvent(new CustomEvent('catalog-overlay-changed'));
}

function getStore(){ return window.UI?.store || window.SolidLogic?.store; }
function getSource(){
  // Avoid circular import: source() lives in utils.js. Re-derive what we need.
  return {
    dataURL: 'https://solidproject.solidcommunity.net/catalog/data',
  };
}

/** Parse a turtle body into the live store. */
function mergeTurtle(body, baseURL){
  const store = getStore();
  if(!store) return;
  try {
    window.$rdf.parse(body, store, baseURL, 'text/turtle');
  } catch(e){
    console.warn('Overlay: failed to parse submission', baseURL, e);
  }
}

/** Pull / push overlays as required by current toggle state. */
export async function refreshOverlays(){
  if(getShowMine()){
    const drafts = listEditRequests();
    for(const e of drafts){
      if(mergedMineIds.has(e.id)) continue;
      mergedMineIds.add(e.id);
      const base = e.targetUrl || getSource().dataURL;
      if(e.body) mergeTurtle(e.body, base);
    }
  }
  if(getShowOthers()){
    try {
      const entries = await fetchPublishLog();
      // Process in chronological order so newer submissions overwrite older
      // ones for the same subject when rdflib re-adds triples.
      entries.sort((a,b)=> new Date(a.modifiedAt) - new Date(b.modifiedAt));
      const fetches = entries
        .filter(e => !mergedUrls.has(e.url))
        .map(async e => {
          mergedUrls.add(e.url);
          try {
            const body = await fetchSubmission(e.url);
            mergeTurtle(body, e.url);
          } catch(err){
            console.warn('Overlay: failed to fetch submission', e.url, err);
          }
        });
      await Promise.all(fetches);
    } catch(e){
      console.warn('Overlay: could not fetch publish log', e);
    }
  }
}
