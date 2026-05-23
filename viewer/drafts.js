// Local-only drafts for catalog records.
// Stored in localStorage so the user can create a record, set it aside, and
// publish to the live catalog later. No pod involvement here — drafts are
// per-browser-profile until the user clicks "publish".

const KEY = 'catalog.drafts.v1';

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    console.warn('Drafts: corrupted store, resetting.', e);
    return [];
  }
}
function save(drafts){
  localStorage.setItem(KEY, JSON.stringify(drafts));
  document.dispatchEvent(new CustomEvent('catalog-drafts-changed', { detail: { count: drafts.length } }));
}

export function listDrafts(){
  return load().slice().sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
}

export function getDraft(id){
  return load().find(d => d.id === id) || null;
}

export function saveDraft(draft){
  const drafts = load();
  const now = Date.now();
  if(draft.id){
    const idx = drafts.findIndex(d => d.id === draft.id);
    if(idx >= 0){
      drafts[idx] = { ...drafts[idx], ...draft, updatedAt: now };
      save(drafts);
      return drafts[idx];
    }
  }
  const id = draft.id || ('draft-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36));
  const created = { id, createdAt: now, updatedAt: now, ...draft };
  drafts.push(created);
  save(drafts);
  return created;
}

export function deleteDraft(id){
  const drafts = load().filter(d => d.id !== id);
  save(drafts);
}

export function draftCount(){
  return load().length;
}

export function getRawDrafts(){ return load(); }
export function setRawDrafts(list){ save(Array.isArray(list) ? list : []); }
