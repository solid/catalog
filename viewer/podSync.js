// Pod sync: mirror local drafts/flags/edit-request stores to a JSON file on
// the user's Solid pod, using the uvdsl session's authFetch for authentication.
//
// Layout on pod: <podCatalogRoot>/drafts.json, /flags.json, /editRequests.json
//
// Strategy:
//  - On session active, pull each file from the pod and merge with local data
//    (union by id, newest timestamp wins).
//  - On any change event, debounce 1.5s and PUT the merged result back.
//  - We never lose data: local-only entries get pushed up; pod-only entries get
//    pulled down.

import { getRawDrafts, setRawDrafts } from './drafts.js';
import { getRawFlags, setRawFlags } from './flags.js';
import { getRawEditRequests, setRawEditRequests } from './editRequests.js';

const STORES = [
  {
    file: 'drafts.json',
    event: 'catalog-drafts-changed',
    getter: getRawDrafts,
    setter: setRawDrafts,
    tsKeys: ['updatedAt', 'createdAt'],
  },
  {
    file: 'flags.json',
    event: 'catalog-flags-changed',
    getter: getRawFlags,
    setter: setRawFlags,
    tsKeys: ['createdAt'],
  },
  {
    file: 'editRequests.json',
    event: 'catalog-editrequests-changed',
    getter: getRawEditRequests,
    setter: setRawEditRequests,
    tsKeys: ['submittedAt'],
  },
];

const debounceTimers = new Map();
let inboundReplacementInProgress = false;

/**
 * Derive a default per-user storage URL from a WebID.
 *  https://pod.example/<seg>/profile/card.jsonld#me  →  https://pod.example/<seg>/catalog/
 * The user may override later by setting localStorage `catalog.podRoot`.
 */
export function defaultPodCatalogRoot(webId){
  if(!webId) return '';
  try {
    const u = new URL(webId);
    const seg = u.pathname.split('/').filter(Boolean)[0];
    if(!seg) return `${u.origin}/catalog/`;
    return `${u.origin}/${seg}/catalog/`;
  } catch { return ''; }
}

function getPodCatalogRoot(){
  const override = localStorage.getItem('catalog.podRoot');
  if(override) return override.replace(/\/?$/, '/');
  const wid = window.solidSession?.webId;
  if(!wid) return '';
  return defaultPodCatalogRoot(wid);
}

function authFetch(...args){
  if(!window.solidSession?.isActive) return fetch(...args);
  return window.solidSession.authFetch(...args);
}

function mergeById(local, remote, tsKeys){
  const tsOf = (item) => {
    for(const k of tsKeys){
      const v = item?.[k];
      if(v != null) return typeof v === 'number' ? v : new Date(v).getTime();
    }
    return 0;
  };
  const byId = new Map();
  for(const it of remote || []) if(it?.id) byId.set(it.id, it);
  for(const it of local || []){
    if(!it?.id) continue;
    const existing = byId.get(it.id);
    if(!existing || tsOf(it) >= tsOf(existing)){
      byId.set(it.id, it);
    }
  }
  return Array.from(byId.values());
}

async function pullOne(store, baseUrl){
  let remote = [];
  try {
    const r = await authFetch(baseUrl + store.file, { headers: { Accept: 'application/json' } });
    if(r.status === 404) {
      // First sync — nothing on pod yet.
    } else if(!r.ok) {
      console.warn(`[podSync] pull ${store.file}: HTTP ${r.status}`);
    } else {
      const text = await r.text();
      if(text.trim()) remote = JSON.parse(text);
    }
  } catch(e){
    console.warn(`[podSync] pull ${store.file} failed`, e);
    return;
  }
  const local = store.getter();
  const merged = mergeById(local, remote, store.tsKeys);
  if(JSON.stringify(local) !== JSON.stringify(merged)){
    inboundReplacementInProgress = true;
    store.setter(merged);
    inboundReplacementInProgress = false;
  }
}

async function pushOne(store, baseUrl){
  const body = JSON.stringify(store.getter(), null, 2);
  try {
    const r = await authFetch(baseUrl + store.file, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if(!r.ok) console.warn(`[podSync] push ${store.file}: HTTP ${r.status}`);
  } catch(e){
    console.warn(`[podSync] push ${store.file} failed`, e);
  }
}

function schedulePush(store){
  if(inboundReplacementInProgress) return; // don't echo our own pull
  const base = getPodCatalogRoot();
  if(!base) return;
  clearTimeout(debounceTimers.get(store.file));
  debounceTimers.set(store.file, setTimeout(() => {
    pushOne(store, base).catch(e => console.warn('[podSync] scheduled push', e));
  }, 1500));
}

let started = false;
export async function startPodSync(){
  if(started) return;
  if(!window.solidSession?.isActive) return;
  const base = getPodCatalogRoot();
  if(!base) return;
  started = true;
  // Initial pull merges remote → local, then we push once to make sure pod has
  // any items that were local-only.
  for(const store of STORES){
    await pullOne(store, base);
  }
  for(const store of STORES){
    pushOne(store, base).catch(e => console.warn('[podSync] initial push', e));
  }
  // Push on change.
  for(const store of STORES){
    document.addEventListener(store.event, () => schedulePush(store));
  }
}
