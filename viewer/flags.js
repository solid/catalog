// Flags: user-reported issues against catalog records (invalid link, archived
// repository, outdated info, duplicate, etc.). Stored locally in localStorage
// so the user can mark records without needing write access to the live pod.

const KEY = 'catalog.flags.v1';

export const FLAG_REASONS = [
  { value: 'invalid-link',     label: 'Invalid link' },
  { value: 'archived-repo',    label: 'Repository archived' },
  { value: 'outdated',         label: 'Information out of date' },
  { value: 'duplicate',        label: 'Duplicate of another record' },
  { value: 'wrong-category',   label: 'Wrong category / subtype' },
  { value: 'spam',             label: 'Spam / not a Solid resource' },
  { value: 'other',            label: 'Other' },
];

export function reasonLabel(value){
  return FLAG_REASONS.find(r => r.value === value)?.label || value;
}

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function save(list){
  localStorage.setItem(KEY, JSON.stringify(list));
  document.dispatchEvent(new CustomEvent('catalog-flags-changed', { detail: { count: list.length } }));
}

export function listFlags(){
  return load().slice().sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
}

export function flagsForSubject(subject){
  return load().filter(f => f.subject === subject);
}

export function flagCount(){
  return load().length;
}

export function addFlag({ subject, label, reason, note, webId }){
  const list = load();
  const id = 'flag-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const entry = {
    id,
    subject: subject || '',
    label: label || '',
    reason: reason || 'other',
    note: (note || '').trim(),
    webId: webId || '',
    createdAt: Date.now(),
  };
  list.push(entry);
  save(list);
  return entry;
}

export function removeFlag(id){
  save(load().filter(f => f.id !== id));
}

export function getRawFlags(){ return load(); }
export function setRawFlags(list){ save(Array.isArray(list) ? list : []); }
