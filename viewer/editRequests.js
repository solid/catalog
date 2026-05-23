// Edit-request log: every time the user publishes (a new record or an edit
// of an existing one), we keep a copy locally so they can see what they have
// submitted to the catalog. Stored in localStorage; no server involvement.

const KEY = 'catalog.editRequests.v1';

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    console.warn('Edit requests: corrupted store, resetting.', e);
    return [];
  }
}
function save(list){
  localStorage.setItem(KEY, JSON.stringify(list));
  document.dispatchEvent(new CustomEvent('catalog-editrequests-changed', { detail: { count: list.length } }));
}

export function listEditRequests(){
  return load().slice().sort((a,b) => (b.submittedAt||0) - (a.submittedAt||0));
}

export function recordEditRequest(entry){
  const list = load();
  const id = entry.id || ('er-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36));
  const item = {
    id,
    submittedAt: Date.now(),
    status: entry.status || 'submitted',
    kind: entry.kind || 'create',
    shape: entry.shape || '',
    shapeLabel: entry.shapeLabel || '',
    subject: entry.subject || '',
    name: entry.name || '',
    targetUrl: entry.targetUrl || '',
    body: entry.body || '',
    fields: entry.fields || {},
  };
  list.push(item);
  save(list);
  return item;
}

export function deleteEditRequest(id){
  save(load().filter(e => e.id !== id));
}

export function editRequestCount(){
  return load().length;
}

export function getRawEditRequests(){ return load(); }
export function setRawEditRequests(list){ save(Array.isArray(list) ? list : []); }
