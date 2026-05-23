import {showRecord} from './showRecord.js';
import {makeTOC} from './makeTOC.js';
import {findFullText,findKeywords,findRecord,findRecordsBySubtype,findName,findRecordsByKeyword,findByName,findPrefLabel,showPage,store,source} from './utils.js';
import {listDrafts, deleteDraft, getDraft, draftCount} from './drafts.js';
import {listEditRequests, deleteEditRequest, editRequestCount} from './editRequests.js';
import {fetchPublishLog, fetchSubmission, prefetchSubmission, summariseSubmission, parseSubmissionFields, publishLogUrl} from './submissionLog.js';
import {refreshOverlays as applyOverlays} from './overlay.js';
import {listFlags, removeFlag, flagCount, flagsForSubject, reasonLabel} from './flags.js';
import {confirmDialog, toast} from './notify.js';
import {renderIcons} from './icons.js';

function findFieldValue(subject, predicateLocalName){
  try {
    const node = $rdf.sym(subject);
    const pred = $rdf.sym(source().vocURL + '#' + predicateLocalName);
    const val = store.any(node, pred);
    return val ? val.value : '';
  } catch(e){ return ''; }
}
function hostFromUrl(u){
  try { return new URL(u).host.replace(/^www\./,''); } catch(e){ return u; }
}

function recordModified(subjectUrl){
  const v = findFieldValue(subjectUrl, 'modified');
  if(!v) return 0;
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}
function dedupeByName(records){
  const byName = new Map();
  for(const r of records){
    const key = (r.label || r.link || '').trim().toLowerCase();
    if(!key){ byName.set(Symbol(), r); continue; }
    const existing = byName.get(key);
    if(!existing || recordModified(r.link) >= recordModified(existing.link)){
      byName.set(key, r);
    }
  }
  return [...byName.values()];
}
function isPersonOrOrg(subjectUrl){
  try {
    const types = store.each($rdf.sym(subjectUrl), source().isa);
    return types.some(t => /Person|Organization/i.test(t.value));
  } catch { return false; }
}

function formatSubmissionDate(iso){
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  if(sameDay){
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if(d.getFullYear() === now.getFullYear()){
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const PATH_TO_SECTION = {
  '/learning': 'learning-resources',
  '/participation': 'participation-opportunities',
  '/apps': 'apps-and-services',
  '/libraries': 'software-libraries',
  '/people': 'organizations-and-people',
};
const SECTION_TO_PATH = Object.fromEntries(Object.entries(PATH_TO_SECTION).map(([k,v])=>[v,k]));

function currentSectionSlug(){
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if(PATH_TO_SECTION[path]) return PATH_TO_SECTION[path];
  const params = new URLSearchParams(window.location.search);
  return params.get('section') || '';
}

export async function viewer(){
  addListeners();
  setupRouter();
  setupRecordSheet();
  await render();
}

// On mobile the record detail (#right-bottom) is presented as a bottom sheet.
// Track when it has content and toggle body.record-open + a tap-to-close
// backdrop. Desktop ignores this (the CSS sheet rules are mobile-only).
function setupRecordSheet(){
  const bottom = document.getElementById('right-bottom');
  if(!bottom) return;

  let backdrop = document.querySelector('.sheet-backdrop');
  if(!backdrop){
    backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    backdrop.addEventListener('click', closeRecordSheet);
    document.body.appendChild(backdrop);
  }

  let closeBtn = bottom.querySelector('.sheet-close');
  if(!closeBtn){
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'sheet-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closeRecordSheet);
  }
  // Place the close button. For record detail, drop it into the header row
  // (same row as the title + ⋯ menu); otherwise pin it as the first child.
  const ensureClose = () => {
    if(bottom.childElementCount === 0) return;
    const actions = bottom.querySelector('.record-header-actions');
    if(actions){
      if(closeBtn.parentNode !== actions) actions.appendChild(closeBtn);
      return;
    }
    if(bottom.firstChild !== closeBtn){
      bottom.insertBefore(closeBtn, bottom.firstChild);
    }
  };
  bottom._ensureClose = ensureClose;

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && document.body.classList.contains('record-open')) closeRecordSheet();
  });

  const sync = () => {
    if(bottom._ensureClose) bottom._ensureClose();
    const hasContent = bottom.querySelector(':scope > :not(.sheet-close)') != null;
    document.body.classList.toggle('record-open', hasContent);
  };
  new MutationObserver(sync).observe(bottom, { childList: true });
  sync();
}

function closeRecordSheet(){
  const bottom = document.getElementById('right-bottom');
  if(bottom){
    bottom.innerHTML = '';
    bottom._sheetStack = [];
    delete bottom.dataset.recordSubject;
  }
  document.body.classList.remove('record-open');
}
window.closeRecordSheet = closeRecordSheet;

async function render(){
  const left = document.getElementById('left-column');
  if(left) left.innerHTML = '';
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  await makeTOC( left );
  // Merge any overlays the user has enabled into the store before counting/
  // rendering, so subtype cards / TOC counts include them.
  try { await applyOverlays(); } catch(e){ console.warn('applyOverlays', e); }
  applySection();
  updateDraftBadge();
  updateEditBadge();
  updateFlagBadge();
  if(path === '/drafts') showDrafts();
  else if(path === '/edits') showEditRequests();
  else if(path === '/submissions') showSubmissions();
  else if(path === '/flags') showFlags();
  else if(currentSectionSlug()) showCategoryHighlights();
  else showRootLanding();
  updateBreadcrumb();
}

// Mobile breadcrumb above the search: "Home / <current page>". Derives the
// page label from document.title, which every view sets.
function updateBreadcrumb(){
  const el = document.querySelector('.breadcrumb');
  if(!el) return;
  const label = (document.title || '').replace(/\s*—\s*Solid Catalog$/, '').trim();
  if(!label || label === 'Solid Catalog'){
    el.innerHTML = `<span class="breadcrumb-current">Home</span>`;
  } else {
    el.innerHTML = `<a href="/" class="breadcrumb-link">Home</a><span class="breadcrumb-sep">/</span><span class="breadcrumb-current">${label}</span>`;
  }
}

function updateDraftBadge(){
  const link = document.querySelector('.drafts-link');
  if(!link) return;
  const c = draftCount();
  link.querySelector('.draft-badge').textContent = c;
  link.style.display = c > 0 ? '' : 'none';
}

function showDrafts(){
  document.body.classList.remove('root-landing');
  const left = document.getElementById('left-column');
  if(left) left.style.display = 'none';
  const right = document.getElementById('right-top');
  const bottom = document.getElementById('right-bottom');
  if(bottom) bottom.innerHTML = '';
  if(!right) return;
  right.innerHTML = '';
  document.title = 'Drafts — Solid Catalog';
  const drafts = listDrafts();
  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const heading = document.createElement('p');
  heading.className = 'link-head';
  heading.innerHTML = `<b>Drafts</b> <span class="link-head-count">${drafts.length}</span>`;
  wrap.appendChild(heading);
  if(!drafts.length){
    const empty = document.createElement('p');
    empty.style.color = 'var(--text-muted)';
    empty.textContent = 'No drafts yet. Use "+ new record" and pick "save as draft" to save progress without publishing.';
    wrap.appendChild(empty);
    right.appendChild(wrap);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  for(const d of drafts){
    const card = document.createElement('article');
    card.className = 'cat-card cat-card-draft';

    const badge = document.createElement('span');
    badge.className = 'draft-badge-card';
    badge.textContent = 'DRAFT';
    card.appendChild(badge);

    const title = document.createElement('a');
    title.className = 'cat-card-title';
    title.href = '#';
    title.textContent = pickField(d, 'name') || '(unnamed draft)';
    title.addEventListener('click', (e) => {
      e.preventDefault();
      previewDraft(d);
    });
    card.appendChild(title);

    const description = pickField(d, 'description');
    if(description){
      const desc = document.createElement('p');
      desc.className = 'cat-card-desc';
      desc.textContent = description;
      card.appendChild(desc);
    }

    const landing = pickField(d, 'landing page') || pickField(d, 'landingPage');
    const repo = pickField(d, 'repository');
    if(landing) card.appendChild(buildLinkRow(landing, 'external-link', hostFromUrl(landing)));
    if(repo) card.appendChild(buildLinkRow(repo, 'repository', hostFromUrl(repo)));

    const meta = document.createElement('p');
    meta.className = 'cat-card-meta';
    const when = new Date(d.updatedAt || d.createdAt).toLocaleString();
    meta.textContent = `${d.shapeLabel || d.shape || 'Record'} • last edited ${when}`;
    card.appendChild(meta);
    const actions = document.createElement('div');
    actions.className = 'draft-actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openDraftInForm(d));
    const publishBtn = document.createElement('button');
    publishBtn.type = 'button';
    publishBtn.className = 'primary';
    publishBtn.textContent = 'Publish';
    publishBtn.addEventListener('click', async () => {
      await openDraftInForm(d);
      setTimeout(() => {
        const btn = document.getElementById('saveRecord');
        if(btn) btn.click();
      }, 400);
    });
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Delete draft?',
        body: `"${d.fields?.name || 'this draft'}" will be removed permanently.`,
        okLabel: 'Delete',
        cancelLabel: 'Keep',
        variant: 'error',
      });
      if(!ok) return;
      deleteDraft(d.id);
      showDrafts();
      updateDraftBadge();
  updateEditBadge();
  updateFlagBadge();
      toast('Draft deleted');
    });
    actions.appendChild(editBtn);
    actions.appendChild(publishBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  right.appendChild(wrap);
  renderIcons();
}

function previewDraft(draft){
  const record = draftToRecord(draft);
  const bottom = document.getElementById('right-bottom');
  if(!bottom) return;
  showRecord(bottom, draft.id, record);
  // Re-wire the edit button so it opens the draft in the form, not the
  // catalog record editor (which would try to load the draft id from the store).
  const editBtn = bottom.querySelector('.edit-button');
  if(editBtn){
    const fresh = editBtn.cloneNode(true);
    editBtn.replaceWith(fresh);
    fresh.addEventListener('click', (e) => {
      e.preventDefault();
      openDraftInForm(draft);
    });
  }
  bottom.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function draftToRecord(draft){
  const f = draft.fields || {};
  const get = (name) => pickField(draft, name);
  const subtype = get('subtype');
  const record = {
    name: get('name') || '(unnamed draft)',
    description: get('description') || '',
    landingPage: get('landing page') || get('landingPage') || '',
    repository: get('repository') || '',
    webid: get('webid') || '',
    serviceEndpoint: get('service endpoint') || '',
    videoCallPage: get('video call page') || '',
    showcase: get('showcase') || '',
    logo: get('logo') || '',
    // showRecord expects an array; pass the SKOS URI so findPrefLabel resolves it.
    subType: subtype ? [subtype] : undefined,
    type: subtype ? [subtype] : [],
  };
  for(const k of ['author','editor','provider','references','keyword']){
    const v = get(k);
    if(v) record[k] = v;
  }
  return record;
}

function pickField(draft, name){
  if(!draft || !draft.fields) return '';
  const target = name.toLowerCase();
  for(const [k, v] of Object.entries(draft.fields)){
    if(k.toLowerCase() === target) return v;
  }
  return '';
}

function showEditRequests(){
  document.body.classList.remove('root-landing');
  const left = document.getElementById('left-column');
  if(left) left.style.display = 'none';
  const right = document.getElementById('right-top');
  const bottom = document.getElementById('right-bottom');
  if(bottom) bottom.innerHTML = '';
  if(!right) return;
  right.innerHTML = '';
  document.title = 'Edit requests — Solid Catalog';
  const entries = listEditRequests();
  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const heading = document.createElement('p');
  heading.className = 'link-head';
  heading.innerHTML = `<b>Edit requests</b> <span class="link-head-count">${entries.length}</span>`;
  wrap.appendChild(heading);
  const sub = document.createElement('p');
  sub.style.color = 'var(--text-muted)';
  sub.style.fontSize = '0.92em';
  sub.style.margin = '0 0 0.75em 0';
  sub.textContent = 'These are the records you have submitted for inclusion in the catalog. They are not visible to others until a maintainer merges them.';
  wrap.appendChild(sub);
  if(!entries.length){
    const empty = document.createElement('p');
    empty.style.color = 'var(--text-muted)';
    empty.textContent = 'No edit requests yet. Publishing a new record or an edit will log it here.';
    wrap.appendChild(empty);
    right.appendChild(wrap);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  for(const e of entries){
    const card = document.createElement('article');
    card.className = 'cat-card cat-card-edit';

    const badge = document.createElement('span');
    badge.className = 'draft-badge-card edit-badge-' + e.kind;
    badge.textContent = e.kind === 'edit' ? 'EDIT' : 'NEW';
    card.appendChild(badge);

    const title = document.createElement('div');
    title.className = 'cat-card-title';
    title.textContent = e.name || '(unnamed)';
    card.appendChild(title);

    if(e.fields?.description){
      const desc = document.createElement('p');
      desc.className = 'cat-card-desc';
      desc.textContent = e.fields.description;
      card.appendChild(desc);
    }

    const landing = e.fields?.['landing page'] || e.fields?.landingPage;
    const repo = e.fields?.repository;
    if(landing) card.appendChild(buildLinkRow(landing, 'external-link', hostFromUrl(landing)));
    if(repo) card.appendChild(buildLinkRow(repo, 'repository', hostFromUrl(repo)));

    const meta = document.createElement('p');
    meta.className = 'cat-card-meta';
    const when = new Date(e.submittedAt).toLocaleString();
    meta.textContent = `${e.shapeLabel || e.shape || 'Record'} • submitted ${when}`;
    card.appendChild(meta);

    const detailsSummary = document.createElement('details');
    detailsSummary.className = 'edit-request-payload';
    const summary = document.createElement('summary');
    summary.textContent = 'Show submitted turtle';
    const pre = document.createElement('pre');
    pre.textContent = e.body || '';
    detailsSummary.appendChild(summary);
    detailsSummary.appendChild(pre);
    card.appendChild(detailsSummary);

    const actions = document.createElement('div');
    actions.className = 'draft-actions';
    if(e.targetUrl){
      const openBtn = document.createElement('a');
      openBtn.textContent = 'Open file';
      openBtn.href = e.targetUrl;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener';
      openBtn.className = '';
      actions.appendChild(openBtn);
    }
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger';
    delBtn.textContent = 'Remove from log';
    delBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Remove edit request from log?',
        body: 'This only removes the local log entry; the submitted file on the catalog (if accepted) is unaffected.',
        okLabel: 'Remove',
        cancelLabel: 'Keep',
        variant: 'error',
      });
      if(!ok) return;
      deleteEditRequest(e.id);
      showEditRequests();
      updateEditBadge();
    });
    actions.appendChild(delBtn);
    card.appendChild(actions);
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  right.appendChild(wrap);
  renderIcons();
}

function updateEditBadge(){
  const link = document.querySelector('.edits-link');
  if(!link) return;
  const c = editRequestCount();
  link.querySelector('.edit-badge').textContent = c;
  link.style.display = c > 0 ? '' : 'none';
}

function updateFlagBadge(){
  const link = document.querySelector('.flags-link');
  if(!link) return;
  const c = flagCount();
  link.querySelector('.flags-count').textContent = c;
  link.style.display = c > 0 ? '' : 'none';
}

function showFlags(){
  document.body.classList.remove('root-landing');
  document.body.classList.remove('submissions-view');
  const left = document.getElementById('left-column');
  if(left) left.style.display = 'none';
  const right = document.getElementById('right-top');
  const bottom = document.getElementById('right-bottom');
  if(bottom) bottom.innerHTML = '';
  if(!right) return;
  right.innerHTML = '';
  document.title = 'Flags — Solid Catalog';

  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const heading = document.createElement('p');
  heading.className = 'link-head';
  heading.innerHTML = `<b>Flagged entries</b>`;
  wrap.appendChild(heading);

  const flags = listFlags();
  const count = document.createElement('span');
  count.className = 'link-head-count';
  count.textContent = flags.length;
  heading.appendChild(count);

  if(!flags.length){
    const empty = document.createElement('p');
    empty.style.color = 'var(--text-muted)';
    empty.textContent = 'No flags yet. Open any record and use the ⚑ Flag button to report a problem.';
    wrap.appendChild(empty);
    right.appendChild(wrap);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  for(const f of flags){
    const card = document.createElement('article');
    card.className = 'cat-card';
    const badge = document.createElement('span');
    badge.className = 'draft-badge-card flag-reason-badge';
    badge.textContent = reasonLabel(f.reason).toUpperCase();
    card.appendChild(badge);
    const title = document.createElement('a');
    title.className = 'cat-card-title';
    title.href = '#';
    title.textContent = f.label || f.subject;
    title.addEventListener('click', (ev) => {
      ev.preventDefault();
      const bottom = document.getElementById('right-bottom');
      showRecord(bottom, f.subject);
      bottom.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    card.appendChild(title);
    if(f.note){
      const note = document.createElement('p');
      note.className = 'cat-card-desc';
      note.textContent = f.note;
      card.appendChild(note);
    }
    const meta = document.createElement('p');
    meta.className = 'cat-card-meta';
    const when = formatSubmissionDate(new Date(f.createdAt).toISOString());
    meta.textContent = `flagged ${when}${f.webId ? ' by ' + new URL(f.webId).host : ''}`;
    meta.title = new Date(f.createdAt).toLocaleString();
    card.appendChild(meta);
    const actions = document.createElement('div');
    actions.className = 'draft-actions';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'danger';
    dismiss.textContent = 'Dismiss flag';
    dismiss.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Dismiss this flag?',
        body: 'It will be removed from your local flag log.',
        okLabel: 'Dismiss',
        cancelLabel: 'Keep',
        variant: 'error',
      });
      if(!ok) return;
      removeFlag(f.id);
      showFlags();
      updateFlagBadge();
      toast('Flag dismissed');
    });
    actions.appendChild(dismiss);
    card.appendChild(actions);
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  right.appendChild(wrap);
  renderIcons();
}

async function showSubmissions(){
  document.body.classList.remove('root-landing');
  document.body.classList.add('submissions-view');
  const left = document.getElementById('left-column');
  if(left) left.style.display = 'none';
  const right = document.getElementById('right-top');
  const bottom = document.getElementById('right-bottom');
  if(bottom){
    bottom.innerHTML = '<p class="submissions-empty-preview" style="color:var(--text-muted);padding:1em;">Select a submission on the left to preview it here.</p>';
  }
  if(!right) return;
  right.innerHTML = '';
  document.title = 'Submissions — Solid Catalog';

  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const heading = document.createElement('p');
  heading.className = 'link-head';
  heading.innerHTML = `<b>Public submissions</b>`;
  const info = document.createElement('span');
  info.className = 'info-icon';
  info.setAttribute('tabindex', '0');
  info.setAttribute('aria-label', 'About this view');
  info.innerHTML = `<i data-lucide="info"></i>`;
  const tip = document.createElement('span');
  tip.className = 'info-tip';
  tip.appendChild(document.createTextNode('Every Publish click PUTs a Turtle file to this central pod folder. The folder is an LDP container, so it acts as the public submission log. Source: '));
  const a = document.createElement('a');
  a.href = publishLogUrl();
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = publishLogUrl();
  tip.appendChild(a);
  info.appendChild(tip);
  heading.appendChild(info);
  wrap.appendChild(heading);

  const status = document.createElement('p');
  status.textContent = 'Loading submissions…';
  status.style.color = 'var(--text-muted)';
  wrap.appendChild(status);
  right.appendChild(wrap);

  let entries;
  try {
    entries = await fetchPublishLog();
  } catch(e){
    status.textContent = 'Could not load submissions: ' + (e.message || e);
    status.style.color = '#b04444';
    return;
  }
  status.remove();

  // Annotate each entry as "new" or "edit": records in the catalog use opaque
  // UUID subjects, so we can't derive the URI from the filename. Instead look
  // up by `ex:name` literal — if any record already has that name in the live
  // catalog data, this submission is an edit of it.
  const nameNode = $rdf.sym(source().vocURL + '#name');
  const allNamed = store.statementsMatching(null, nameNode);
  const knownNames = new Set(allNamed.map(s => (s.object?.value || '').trim().toLowerCase()).filter(Boolean));
  for(const e of entries){
    const key = (e.name || '').trim().toLowerCase();
    e.kind = knownNames.has(key) ? 'edit' : 'new';
  }

  if(!entries.length){
    const empty = document.createElement('p');
    empty.textContent = 'No submissions yet.';
    empty.style.color = 'var(--text-muted)';
    wrap.appendChild(empty);
    return;
  }

  const count = document.createElement('span');
  count.className = 'link-head-count';
  count.textContent = entries.length;
  heading.appendChild(count);

  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  for(const e of entries){
    const card = document.createElement('article');
    card.className = 'cat-card cat-card-submission cat-card-clickable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Preview submission ${e.name}`);
    let prefetched = false;
    const triggerPrefetch = () => {
      if(prefetched) return;
      prefetched = true;
      prefetchSubmission(e.url);
    };
    card.addEventListener('mouseenter', triggerPrefetch);
    card.addEventListener('focusin', triggerPrefetch);
    card.addEventListener('touchstart', triggerPrefetch, { passive: true });
    card.addEventListener('click', (ev) => {
      // Allow native click on inner links (Open turtle file, etc.) without triggering preview.
      if(ev.target.closest('a')) return;
      ev.preventDefault();
      previewSubmission(e);
    });
    card.addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        previewSubmission(e);
      }
    });
    const badge = document.createElement('span');
    badge.className = 'draft-badge-card edit-badge-' + (e.kind === 'edit' ? 'edit' : 'create');
    badge.textContent = e.kind === 'edit' ? 'EDIT' : 'NEW';
    card.appendChild(badge);

    const title = document.createElement('div');
    title.className = 'cat-card-title';
    title.textContent = e.name;
    card.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'cat-card-meta';
    const when = formatSubmissionDate(e.modifiedAt);
    const action = e.kind === 'edit' ? 'edited' : 'added';
    meta.textContent = `${action} • ${when}`;
    meta.title = new Date(e.modifiedAt).toLocaleString();
    card.appendChild(meta);

    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  renderIcons();
}

async function previewSubmission(entry){
  const bottom = document.getElementById('right-bottom');
  if(!bottom) return;
  bottom.innerHTML = '<p style="color:var(--text-muted)">Loading submission…</p>';
  bottom.scrollIntoView({ behavior: 'smooth', block: 'start' });
  let body;
  try {
    body = await fetchSubmission(entry.url);
  } catch(e){
    bottom.innerHTML = `<p style="color:#b04444">Could not load submission: ${e.message || e}</p>`;
    return;
  }
  const submittedFields = parseSubmissionFields(body);
  const summary = summariseSubmission(body);
  const record = {
    name: summary.name || entry.name || '(unnamed submission)',
    description: summary.description || '',
    landingPage: summary.landingPage || '',
    repository: summary.repository || '',
    type: [],
  };
  // Use showRecord for consistent styling, then replace its edit-row with a
  // submission-specific action set (open file / fetched on / NEW vs EDIT).
  showRecord(bottom, entry.url, record);
  const editRow = bottom.querySelector('.edit-row');
  if(editRow){
    editRow.innerHTML = '';
    const badge = document.createElement('span');
    badge.className = 'draft-badge-card edit-badge-' + (entry.kind === 'edit' ? 'edit' : 'create');
    badge.style.marginRight = '0.5em';
    badge.textContent = entry.kind === 'edit' ? 'EDIT' : 'NEW';
    editRow.appendChild(badge);
    const meta = document.createElement('span');
    meta.style.color = 'var(--text-muted)';
    meta.style.fontSize = '0.9em';
    meta.textContent = `submitted ${formatSubmissionDate(entry.modifiedAt)}`;
    meta.title = new Date(entry.modifiedAt).toLocaleString();
    editRow.appendChild(meta);
    const open = document.createElement('a');
    open.href = entry.url;
    open.target = '_blank';
    open.rel = 'noopener';
    open.style.marginLeft = '1em';
    open.textContent = 'Open turtle file';
    editRow.appendChild(open);
  }

  // For edits, render a diff against the current catalog state.
  if(entry.kind === 'edit'){
    const diffEl = buildSubmissionDiff(submittedFields);
    if(diffEl) bottom.querySelector('.record')?.appendChild(diffEl);
  }
}

function buildSubmissionDiff(submitted){
  const name = (submitted.name || '').trim();
  if(!name) return null;
  // Find the existing record by matching its ex:name literal.
  const nameNode = $rdf.sym(source().vocURL + '#name');
  const stmts = store.statementsMatching(null, nameNode);
  const match = stmts.find(s => (s.object?.value || '').trim() === name);
  if(!match) return null;
  const subject = match.subject;
  const current = currentFieldsForSubject(subject);
  const keys = new Set([...Object.keys(submitted), ...Object.keys(current)]);
  keys.delete('modified');

  const wrap = document.createElement('div');
  wrap.className = 'submission-diff';
  const title = document.createElement('h3');
  title.textContent = 'Diff against current catalog';
  wrap.appendChild(title);

  let anyChange = false;
  for(const key of Array.from(keys).sort()){
    const before = (current[key] || '').toString().trim();
    const after = (submitted[key] || '').toString().trim();
    if(before === after) continue;
    anyChange = true;
    const row = document.createElement('div');
    row.className = 'diff-row';
    const label = document.createElement('div');
    label.className = 'diff-key';
    label.textContent = key;
    row.appendChild(label);
    const lines = document.createElement('div');
    lines.className = 'diff-lines';
    if(before){
      const b = document.createElement('div');
      b.className = 'diff-line diff-removed';
      b.textContent = '− ' + before;
      lines.appendChild(b);
    }
    if(after){
      const a = document.createElement('div');
      a.className = 'diff-line diff-added';
      a.textContent = '+ ' + after;
      lines.appendChild(a);
    }
    row.appendChild(lines);
    wrap.appendChild(row);
  }
  if(!anyChange){
    const same = document.createElement('p');
    same.style.color = 'var(--text-muted)';
    same.textContent = 'No field-level changes detected between this submission and the current record.';
    wrap.appendChild(same);
  }
  return wrap;
}

function currentFieldsForSubject(subject){
  // Pull every triple where this is the subject, group ex:* predicates by local name.
  const out = {};
  const triples = store.statementsMatching(subject, null, null);
  for(const t of triples){
    const pred = t.predicate.value;
    const localMatch = pred.match(/[#\/]([^#\/]+)$/);
    if(!localMatch) continue;
    const key = localMatch[1];
    if(key === 'type' || key === 'modified') continue;
    const val = t.object.value;
    if(out[key]) out[key] = out[key] + ', ' + val;
    else out[key] = val;
  }
  return out;
}

async function openDraftInForm(draft){
  // The form layer appends 'Shape' itself; pass the bare name regardless of
  // how it was stored.
  const bareShape = (draft.shape || '').replace(/Shape$/, '');
  const shapeFull = bareShape ? `${source().shaclURL}#${bareShape}` : undefined;
  await showPage('record', { type: shapeFull, draft });
}

function setupRouter(){
  document.addEventListener('catalog-drafts-changed', updateDraftBadge);
  document.addEventListener('catalog-editrequests-changed', updateEditBadge);
  document.addEventListener('catalog-flags-changed', () => {
    updateFlagBadge();
    if(isHideFlagged()) rerenderView();
  });

  // Intercept clicks on links to in-app routes; use pushState instead of full reload.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    if(a.target === '_blank' || a.hasAttribute('download')) return;
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href');
    if(!href || /^[a-z]+:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('#')) return;
    const url = new URL(href, location.href);
    if(url.origin !== location.origin) return;
    const cleanPath = url.pathname.replace(/\/$/, '');
    const isAppRoute = url.pathname === '/' || PATH_TO_SECTION[cleanPath] || cleanPath === '/drafts' || cleanPath === '/edits' || cleanPath === '/submissions' || cleanPath === '/flags';
    if(!isAppRoute) return;
    e.preventDefault();
    if(url.pathname !== location.pathname || url.search !== location.search){
      history.pushState({}, '', url.pathname + url.search);
      teardownCurrentView();
      render();
    }
  });
  window.addEventListener('popstate', () => {
    teardownCurrentView();
    render();
  });
}

function teardownCurrentView(){
  document.body.classList.remove('root-landing');
  document.body.classList.remove('submissions-view');
  const left = document.getElementById('left-column');
  if(left) left.style.display = '';
  for(const el of document.querySelectorAll('.sol-sections a.active')) el.classList.remove('active');
  document.title = 'Solid Catalog';
  const right = document.getElementById('right-top');
  const bottom = document.getElementById('right-bottom');
  if(right) right.innerHTML = '';
  if(bottom) bottom.innerHTML = '';
}

const SECTION_DESCRIPTIONS = {
  'learning-resources': 'Primers, tutorials, use cases, and references for working with Solid.',
  'participation-opportunities': 'Get a pod, join a discussion, attend an event.',
  'apps-and-services': 'Apps built on Solid plus the services that host and connect them.',
  'software-libraries': 'Libraries, frameworks, and components for building Solid software.',
  'organizations-and-people': 'Companies, projects, universities, and people in the Solid community.',
};
function sectionSlug(label){
  return (label||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function showRootLanding(){
  document.body.classList.add('root-landing');
  const left = document.getElementById('left-column');
  if(left) left.style.display = 'none';
  const right = document.getElementById('right-top');
  const bottom = document.getElementById('right-bottom');
  if(bottom) bottom.innerHTML = '';
  if(!right) return;
  right.innerHTML = '';

  const skosPrefix = 'http://www.w3.org/2004/02/skos/core#';
  const taxonomyNode = $rdf.sym(source().skosURL + '#SolidCatalogTaxonomy');
  const topConceptNode = $rdf.sym(skosPrefix + 'hasTopConcept');
  const labelNode = $rdf.sym(skosPrefix + 'prefLabel');
  const altLabelNode = $rdf.sym(skosPrefix + 'altLabel');
  const narrower = $rdf.sym(skosPrefix + 'narrower');
  const broader = $rdf.sym(skosPrefix + 'broader');
  const hasSubtype = source().subtypeNode;
  const tops = store.each(taxonomyNode, topConceptNode);

  const wrap = document.createElement('div');
  wrap.className = 'root-landing-grid';
  for(const tc of tops){
    const label = (store.any(tc, altLabelNode)||{}).value || (store.any(tc, labelNode)||{}).value;
    if(!label) continue;
    const slug = sectionSlug(label);
    let subs = store.each(tc, narrower);
    if(subs.length === 0) subs = store.each(null, broader, tc);
    const subList = [];
    let total = 0;
    for(const s of subs){
      const sLabel = ((store.any(s, altLabelNode)||{}).value || (store.any(s, labelNode)||{}).value || '').replace(/\(.*$/,'').trim();
      let count = store.each(null, hasSubtype, s).length;
      if(count === 0) count = store.each(null, source().isa, s).length;
      total += count;
      if(count > 0) subList.push({ label: sLabel, count });
    }
    subList.sort((a,b)=> b.count - a.count);

    const card = document.createElement('a');
    card.className = 'root-card';
    card.href = SECTION_TO_PATH[slug] || `/?section=${slug}`;

    const head = document.createElement('div');
    head.className = 'root-card-head';
    const title = document.createElement('h2');
    title.textContent = label;
    const count = document.createElement('span');
    count.className = 'root-card-count';
    count.textContent = total;
    head.appendChild(title);
    head.appendChild(count);
    card.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'root-card-desc';
    desc.textContent = SECTION_DESCRIPTIONS[slug] || '';
    card.appendChild(desc);

    if(subList.length){
      const ul = document.createElement('ul');
      ul.className = 'root-card-subs';
      const MAX = 6;
      const visible = subList.slice(0, MAX);
      for(const s of visible){
        const li = document.createElement('li');
        li.innerHTML = `<span>${s.label}</span><span class="sub-count">${s.count}</span>`;
        ul.appendChild(li);
      }
      if(subList.length > MAX){
        const more = document.createElement('li');
        more.className = 'sub-more';
        more.textContent = `+ ${subList.length - MAX} more`;
        ul.appendChild(more);
      }
      card.appendChild(ul);
    }
    wrap.appendChild(card);
  }
  right.appendChild(wrap);
}

function applySection(){
  const section = currentSectionSlug();
  if(!section) return;
  for(const a of document.querySelectorAll('.sol-sections a')){
    if(a.getAttribute('data-section') === section) a.classList.add('active');
  }
  const sectionLabel = document.querySelector('.sol-sections a.active');
  if(sectionLabel){
    document.title = `${sectionLabel.textContent} — Solid Catalog`;
  }
}

function showCategoryHighlights(){
  _lastView = showCategoryHighlights;
  const right = document.getElementById('right-top');
  if(!right) return;
  right.innerHTML = '';
  const anchors = document.querySelectorAll('#toc a.subtype, #toc a.type');
  const sections = [];
  for(const a of anchors){
    const href = a.getAttribute('data-href');
    if(!href) continue;
    const label = a.textContent.trim();
    const records = findRecordsBySubtype(href);
    if(!records.length) continue;
    sections.push({label, href, records});
  }
  if(!sections.length) return;
  sections.forEach((s, i) => { s.headingId = 'cat-section-' + i; });
  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const allRecords = sections.flatMap(s => s.records);
  const chips = buildCategoryChips(sections);
  if(chips) wrap.appendChild(chips);
  const statusBar = buildStatusFilterBar(allRecords);
  if(statusBar) wrap.appendChild(statusBar);
  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  wrap.appendChild(grid);
  for(const s of sections){
    const catHeading = document.createElement('h3');
    catHeading.className = 'cat-heading';
    catHeading.id = s.headingId;
    const text = document.createElement('span');
    text.className = 'cat-heading-text';
    text.textContent = s.label;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add-chip';
    add.setAttribute('aria-label', `Add to ${s.label}`);
    add.innerHTML = `<i data-lucide="plus"></i><span>Add</span>`;
    add.addEventListener('click', () => showPage('type-chooser'));
    catHeading.appendChild(text);
    catHeading.appendChild(add);
    grid.appendChild(catHeading);
    const subGrid = buildCardGrid(s.records);
    for(const card of [...subGrid.children]){ grid.appendChild(card); }
  }
  right.appendChild(wrap);
  if(chips) setupScrollSpy(sections, chips);
  renderIcons();
}
function addListeners(){
    document.addEventListener('keydown',(e)=>{
      const mod = e.metaKey || e.ctrlKey;
      if(mod && (e.key === 'k' || e.key === 'K' || e.key === '/')){
        const input = document.querySelector('.search-input input');
        if(input){
          e.preventDefault();
          input.focus();
          input.select();
        }
      }
    });
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
        hideSuggestions();
        showSearchResults(searchInput.value);
      } else if (event.key === 'Escape') {
        hideSuggestions();
      } else if (event.key === 'ArrowDown') {
        const box = document.querySelector('.search-suggest');
        const first = box && box.querySelector('a');
        if (first) { event.preventDefault(); first.focus(); }
      }
    });
    let suggestTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(suggestTimer);
      const term = searchInput.value.trim();
      if (term.length < 2) { hideSuggestions(); return; }
      suggestTimer = setTimeout(() => renderSuggestions(searchInput, term), 80);
    });
    searchInput.addEventListener('blur', () => {
      setTimeout(hideSuggestions, 150);
    });
    keyIndexButton.addEventListener('click',(e)=>{
      e.preventDefault();
      showKeywordIndex();
    });
    if(newButton){
      newButton.addEventListener('click',(e)=>{
        e.preventDefault();
        showPage('type-chooser');
      });
    }
    if(aboutButton){
      aboutButton.addEventListener('click',(e)=>{
        e.preventDefault();
        showHelp();
      });
    }
}
window.showAbout = () => showHelp();
function goHome(){
  const searchInput = document.querySelector('.search-input input');
  if(searchInput) searchInput.value = '';
  hideSuggestions();
  document.getElementById('right-top').innerHTML = '';
  document.getElementById('right-bottom').innerHTML = '';
  showCategoryHighlights();
}
function hideSuggestions(){
  const box = document.querySelector('.search-suggest');
  if (box) box.remove();
}
function renderSuggestions(input, term){
  hideSuggestions();
  const matches = findByName(term).slice(0, 8);
  if (!matches.length) return;
  const container = input.closest('sol-catalog-search') || input.parentNode;
  container.style.position = container.style.position || 'relative';
  const box = document.createElement('div');
  box.className = 'search-suggest';
  for (const m of matches){
    const a = document.createElement('a');
    a.href = m.link;
    a.textContent = m.label;
    a.tabIndex = 0;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      hideSuggestions();
      findAndShowRecord(a.getAttribute('href'));
    });
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); a.click(); }
      else if (e.key === 'ArrowDown' && a.nextElementSibling) { e.preventDefault(); a.nextElementSibling.focus(); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (a.previousElementSibling) a.previousElementSibling.focus();
        else input.focus();
      } else if (e.key === 'Escape') {
        hideSuggestions(); input.focus();
      }
    });
    box.appendChild(a);
  }
  container.appendChild(box);
}
function findAndShowRecord(subject){
  const record = findRecord(subject);
  showRecord(document.getElementById('right-bottom'), subject, record);
}
let _helpEscHandler = null;
function showHelp(){
  const help = document.getElementById('help');
  document.body.classList.remove('noHelp');
  document.body.classList.add('showHelp');
  help.style.display = "block";
  if(!help.querySelector('.modal-close')){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-close';
    btn.setAttribute('aria-label','Close');
    btn.title = 'Close (Esc)';
    btn.textContent = '✕';
    btn.addEventListener('click', hideHelp);
    help.appendChild(btn);
  }
  if(!_helpEscHandler){
    _helpEscHandler = (e)=>{ if(e.key === 'Escape'){ e.preventDefault(); hideHelp(); } };
    document.addEventListener('keydown', _helpEscHandler);
  }
}
function hideHelp(){
  const help = document.getElementById('help');
  document.body.classList.remove('showHelp');
  document.body.classList.add('noHelp');
  help.style.display = "none";
  if(_helpEscHandler){
    document.removeEventListener('keydown', _helpEscHandler);
    _helpEscHandler = null;
  }
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
function showKeywordIndex(){
  let keywords = findKeywords();
  const recordDisplay = document.getElementById('right-bottom');
  const linkDisplay = document.getElementById('right-top');
  recordDisplay.innerHTML="";
  linkDisplay.innerHTML="";
  let str = `<div class="keyword-index"><p class="link-head"><b>Keyword Index</b></p>`;
  for(let k of keywords){
    str += `<a href="${k}" class="link">${k}</a>`;
  }
  str += `</div>`;
  linkDisplay.innerHTML = str;
  let keyAnchors = linkDisplay.querySelectorAll('a');
  for(let ka of keyAnchors){
    ka.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecordsByKeyword(e.target.getAttribute('href'));
    });
  }
}
export function showMainCategory(label, subtypeUris){
  const linkDisplay = document.getElementById('right-top');
  const recordDisplay = document.getElementById('right-bottom');
  linkDisplay.innerHTML = "";
  recordDisplay.innerHTML = "";
  const seen = {};
  const records = [];
  for(const uri of subtypeUris){
    for(const r of findRecordsBySubtype(uri)){
      if(seen[r.link]) continue;
      seen[r.link] = true;
      records.push(r);
    }
  }
  records.isort();
  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const heading = document.createElement('p');
  heading.className = 'link-head';
  heading.innerHTML = `<b>${label}</b> <span class="link-head-count">${records.length}</span>`;
  wrap.appendChild(heading);
  _lastView = () => showMainCategory(label, subtypeUris);
  const statusBar = buildStatusFilterBar(records);
  if(statusBar) wrap.appendChild(statusBar);
  wrap.appendChild(buildCardGrid(records));
  linkDisplay.appendChild(wrap);
}
window.showMainCategory = showMainCategory;

export function showSubtypes(subtype,label){
  const records = findRecordsBySubtype(subtype);
  const linkDisplay = document.getElementById('right-top');
  const recordDisplay = document.getElementById('right-bottom');
  linkDisplay.innerHTML = "";
  recordDisplay.innerHTML = "";
  const wrap = document.createElement('div');
  wrap.className = 'category-highlights';
  const heading = document.createElement('p');
  heading.className = 'link-head';
  heading.innerHTML = `<b>${label}</b>`;
  wrap.appendChild(heading);
  const statusBar = buildStatusFilterBar(records);
  if(statusBar) wrap.appendChild(statusBar);
  wrap.appendChild(buildCardGrid(records));
  linkDisplay.appendChild(wrap);
  _lastView = () => showSubtypes(subtype, label);
}

let _lastView = null;
function rerenderView(){ if(_lastView) _lastView(); }
function isOnlyWithLinks(){ return window.catalogFilter?.getOnlyWithLink?.() === true; }
function isHideFlagged(){ return window.catalogFilter?.getHideFlagged?.() === true; }

// --- Status helpers -------------------------------------------------------
function recordStatusLabel(subjectUrl){
  const raw = findFieldValue(subjectUrl, 'status');
  if(!raw) return '';
  // status is a SKOS concept URI; resolve its prefLabel.
  const label = findPrefLabel(raw);
  return (label || raw.replace(/.*[#/]/, '')).trim();
}
const HIDDEN_STATUS_KEY = 'catalog.hiddenStatuses';
function getHiddenStatuses(){
  try {
    const raw = localStorage.getItem(HIDDEN_STATUS_KEY);
    // Default (no preference saved yet): hide archived items.
    if(raw === null) return new Set(['Archived']);
    return new Set(JSON.parse(raw));
  } catch { return new Set(['Archived']); }
}
function setHiddenStatuses(set){
  localStorage.setItem(HIDDEN_STATUS_KEY, JSON.stringify([...set]));
}
function toggleHiddenStatus(status){
  const set = getHiddenStatuses();
  if(set.has(status)) set.delete(status); else set.add(status);
  setHiddenStatuses(set);
  rerenderView();
}
/** Distinct status labels present across the given records, sorted. */
function distinctStatuses(records){
  const s = new Set();
  for(const r of records){
    const lbl = recordStatusLabel(r.link);
    if(lbl) s.add(lbl);
  }
  return [...s].sort();
}
/** Build the status filter chip row (or null if <2 statuses present). */
function buildStatusFilterBar(records){
  const statuses = distinctStatuses(records);
  if(statuses.length < 2) return null; // nothing meaningful to filter
  const hidden = getHiddenStatuses();
  const bar = document.createElement('div');
  bar.className = 'status-filter-bar';
  const label = document.createElement('span');
  label.className = 'status-filter-label';
  label.textContent = 'Status';
  bar.appendChild(label);
  for(const st of statuses){
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'status-chip' + (hidden.has(st) ? ' off' : '');
    chip.textContent = st;
    chip.title = hidden.has(st) ? `Show ${st}` : `Hide ${st}`;
    chip.addEventListener('click', () => toggleHiddenStatus(st));
    bar.appendChild(chip);
  }
  return bar;
}

let _scrollSpyObserver = null;
/** Horizontal scrollable chip slider; each chip scrolls to its section heading. */
function buildCategoryChips(sections){
  if(!sections || !sections.length) return null;
  const slider = document.createElement('div');
  slider.className = 'cat-chip-slider';
  for(const s of sections){
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cat-chip';
    chip.dataset.headingId = s.headingId;
    chip.textContent = s.label;
    chip.addEventListener('click', () => {
      const target = document.getElementById(s.headingId);
      if(target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    slider.appendChild(chip);
  }
  return slider;
}

/** Scroll-spy: highlight the chip whose section is currently near the top. */
function setupScrollSpy(sections, slider){
  if(_scrollSpyObserver){ _scrollSpyObserver.disconnect(); _scrollSpyObserver = null; }
  if(!slider) return;
  const chipFor = (id) => slider.querySelector(`.cat-chip[data-heading-id="${id}"]`);
  const visible = new Set();
  const setActive = (id) => {
    for(const c of slider.querySelectorAll('.cat-chip')) c.classList.remove('active');
    const chip = id && chipFor(id);
    if(chip){
      chip.classList.add('active');
      // Keep the chip in view by scrolling only the slider horizontally —
      // never the page (that caused the view to jump back up).
      const sRect = slider.getBoundingClientRect();
      const cRect = chip.getBoundingClientRect();
      if(cRect.left < sRect.left) slider.scrollLeft -= (sRect.left - cRect.left) + 12;
      else if(cRect.right > sRect.right) slider.scrollLeft += (cRect.right - sRect.right) + 12;
    }
  };
  _scrollSpyObserver = new IntersectionObserver((entries) => {
    for(const e of entries){
      if(e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
    }
    // Pick the first section (in document order) that is currently visible.
    const firstVisible = sections.map(s => s.headingId).find(id => visible.has(id));
    if(firstVisible) setActive(firstVisible);
  }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });
  for(const s of sections){
    const h = document.getElementById(s.headingId);
    if(h) _scrollSpyObserver.observe(h);
  }
  // Default: first chip active.
  setActive(sections[0]?.headingId);
}
document.addEventListener('catalog-filter-changed', () => rerenderView());
document.addEventListener('catalog-overlay-changed', () => render());
function buildCardGrid(records){
  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  let filtered = records;
  if(isOnlyWithLinks()){
    filtered = filtered.filter(r => !!(findFieldValue(r.link, 'landingPage') || findFieldValue(r.link, 'repository') || findFieldValue(r.link, 'serviceEndpoint')));
  }
  if(isHideFlagged()){
    filtered = filtered.filter(r => flagsForSubject(r.link).length === 0);
  }
  const hiddenStatuses = getHiddenStatuses();
  if(hiddenStatuses.size){
    filtered = filtered.filter(r => !hiddenStatuses.has(recordStatusLabel(r.link)));
  }
  // De-duplicate records that share the same name (e.g. an overlaid submission
  // edit has a different subject URI than the catalog's UUID-based record).
  // Keep the most-recently-modified version so edits replace, not duplicate.
  filtered = dedupeByName(filtered);
  for(const r of filtered){
    const card = document.createElement('article');
    card.className = 'cat-card';
    const statusLabel = recordStatusLabel(r.link);
    if(statusLabel){
      const sb = document.createElement('span');
      sb.className = 'card-status status-' + statusLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      sb.textContent = statusLabel;
      card.appendChild(sb);
    }
    const title = document.createElement('a');
    title.className = 'cat-card-title';
    title.href = r.link;
    title.textContent = r.label;
    title.addEventListener('click',(e)=>{
      e.preventDefault();
      const rec = findRecord(r.link);
      showRecord(document.getElementById('right-bottom'), r.link, rec);
    });
    // Show an avatar/logo when the record has one (circular for people & orgs).
    const logo = findFieldValue(r.link, 'logo');
    if(logo){
      const head = document.createElement('div');
      head.className = 'cat-card-head';
      const img = document.createElement('img');
      img.className = 'cat-card-avatar' + (isPersonOrOrg(r.link) ? ' is-round' : '');
      img.src = logo;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => head.classList.add('avatar-failed'));
      head.appendChild(img);
      head.appendChild(title);
      card.appendChild(head);
    } else {
      card.appendChild(title);
    }
    const description = findFieldValue(r.link, 'description');
    if(description){
      const desc = document.createElement('p');
      desc.className = 'cat-card-desc';
      desc.textContent = description;
      card.appendChild(desc);
    }
    const landing = findFieldValue(r.link, 'landingPage');
    const repo = findFieldValue(r.link, 'repository');
    const serviceEndpoint = findFieldValue(r.link, 'serviceEndpoint');
    let webid = findFieldValue(r.link, 'webid');
    if(!webid && isPersonOrOrg(r.link) && /^https?:\/\//i.test(r.link)) webid = r.link;
    if(webid) card.appendChild(buildLinkRow(webid, 'user', hostFromUrl(webid)));
    if(landing) card.appendChild(buildLinkRow(landing, 'external-link', hostFromUrl(landing)));
    if(repo) card.appendChild(buildLinkRow(repo, 'repository', hostFromUrl(repo)));
    if(serviceEndpoint) card.appendChild(buildLinkRow(serviceEndpoint, 'server', hostFromUrl(serviceEndpoint)));
    grid.appendChild(card);
  }
  // Defer icon upgrade so it runs after the caller has inserted the grid
  // into the live DOM (createIcons needs the placeholders to have parentNodes).
  queueMicrotask(() => renderIcons());
  return grid;
}

const GITHUB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.37-.93-.9-1.18-.9-1.18-.74-.5.06-.49.06-.49.81.06 1.24.84 1.24.84.72 1.24 1.9.89 2.36.68.07-.52.28-.88.5-1.08-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.22 2.2.82A7.6 7.6 0 0 1 8 4.2c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;

function buildLinkRow(href, iconName, label){
  const a = document.createElement('a');
  a.className = 'cat-card-link';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  const iconWrap = document.createElement('span');
  iconWrap.className = 'cat-card-link-icon';
  if(iconName === 'repository'){
    const host = (() => { try { return new URL(href).host.replace(/^www\./,''); } catch { return ''; } })();
    if(host === 'github.com'){
      iconWrap.innerHTML = GITHUB_SVG;
    } else {
      const i = document.createElement('i');
      i.setAttribute('data-lucide', 'git-branch');
      iconWrap.appendChild(i);
    }
  } else {
    const i = document.createElement('i');
    i.setAttribute('data-lucide', iconName);
    iconWrap.appendChild(i);
  }
  a.appendChild(iconWrap);
  const text = document.createElement('span');
  text.textContent = label;
  a.appendChild(text);
  return a;
}


