// Solid OIDC login via uvdsl's @uvdsl/solid-oidc-client-browser.
// IMPORTANT: this module runs an OIDC redirect-handling step EAGERLY at import time,
// before mashlib has a chance to clear sessionStorage values (idp, csrf_token, pkce
// code verifier) that uvdsl needs to finish the handshake.

import { notifyError } from './notify.js';
import { getShowMine, setShowMine, getShowOthers, setShowOthers, refreshOverlays } from './overlay.js';
import { draftCount } from './drafts.js';
import { editRequestCount } from './editRequests.js';
import { flagCount } from './flags.js';
import { startPodSync } from './podSync.js';
import { renderIcons } from './icons.js';

const FILTER_KEY = 'catalog.onlyWithLink';
const HIDE_FLAGGED_KEY = 'catalog.hideFlagged';
function getOnlyWithLink(){ return localStorage.getItem(FILTER_KEY) === '1'; }
function setOnlyWithLink(v){
  if(v) localStorage.setItem(FILTER_KEY, '1');
  else localStorage.removeItem(FILTER_KEY);
  document.dispatchEvent(new CustomEvent('catalog-filter-changed', { detail: { onlyWithLink: !!v } }));
}
function getHideFlagged(){ return localStorage.getItem(HIDE_FLAGGED_KEY) === '1'; }
function setHideFlagged(v){
  if(v) localStorage.setItem(HIDE_FLAGGED_KEY, '1');
  else localStorage.removeItem(HIDE_FLAGGED_KEY);
  document.dispatchEvent(new CustomEvent('catalog-filter-changed', { detail: { hideFlagged: !!v } }));
}
window.catalogFilter = { getOnlyWithLink, setOnlyWithLink, getHideFlagged, setHideFlagged };

const CDN = 'https://cdn.jsdelivr.net/npm/@uvdsl/solid-oidc-client-browser/dist/esm/web/index.js';
const WORKER_CDN = 'https://cdn.jsdelivr.net/npm/@uvdsl/solid-oidc-client-browser/dist/esm/web/RefreshWorker.js';
const DEFAULT_IDP = 'https://pod.mpeters.dev';

let lib = null;
let session = null;
let workerBlobUrl = null;
const redirectInFlight = handleRedirectIfPresent();

function redirectUri(){
  // The OIDC redirect_uri must be a path that always returns index.html.
  // We always redirect back to the origin root, regardless of which client-side
  // route the user was on when they clicked Log In, so the IdP only ever knows
  // one URI and SPA navigation doesn't break the handshake.
  return location.origin + '/';
}

async function ensureLib(){
  if(lib) return lib;
  lib = await import(/* @vite-ignore */ CDN);
  return lib;
}

async function getWorkerBlobUrl(){
  if(workerBlobUrl) return workerBlobUrl;
  const src = await fetch(WORKER_CDN).then(r => r.text());
  workerBlobUrl = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
  return workerBlobUrl;
}

async function ensureSession(){
  if(session) return session;
  const { Session, SessionEvents } = await ensureLib();
  const clientDetails = {
    client_name: 'Solid Resources Catalog',
    redirect_uris: [redirectUri()],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
  const workerUrl = await getWorkerBlobUrl();
  session = new Session(clientDetails, { workerUrl });
  session.addEventListener(SessionEvents.STATE_CHANGE, onSessionStateChange);
  window.solidSession = session;
  return session;
}

function getStoredIdp(){
  return localStorage.getItem('catalog.idp') || DEFAULT_IDP;
}
function setStoredIdp(v){ localStorage.setItem('catalog.idp', v); }

function onSessionStateChange(){
  renderAuthUi();
  if(session && session.isActive){
    startPodSync().catch(e => console.warn('podSync start failed', e));
  }
}

function renderAuthUi(){
  const slot = document.querySelector('.nav-auth');
  if(!slot) return;
  document.body.classList.toggle('logged-out', !(session && session.isActive));
  slot.innerHTML = '';
  if(!session || !session.isActive){
    const loginBtn = document.createElement('solid-ui-button');
    loginBtn.setAttribute('label', 'Log In');
    loginBtn.setAttribute('variant', 'primary');
    loginBtn.setAttribute('size', 'md');
    loginBtn.addEventListener('click', () => { login().catch(console.error); });
    const signupBtn = document.createElement('solid-ui-button');
    signupBtn.setAttribute('label', 'Sign Up');
    signupBtn.setAttribute('size', 'md');
    signupBtn.addEventListener('click', () => { window.open('https://solidproject.org/users/get-a-pod', '_blank'); });
    slot.appendChild(loginBtn);
    slot.appendChild(signupBtn);
  }
  slot.appendChild(buildAvatarMenu());
  renderIcons(slot);
  if(session && session.isActive){
    // Cache the logged-in WebID so the next page load can paint the avatar
    // in the first frame (see the inline injector in index.html).
    try { localStorage.setItem('catalog.cachedWebId', session.webId || ''); } catch(e){}
    const cachedAvatar = localStorage.getItem('catalog.cachedAvatar');
    const img = slot.querySelector('.nav-avatar img');
    const initials = slot.querySelector('.nav-avatar-initials');
    if(cachedAvatar && img){ img.src = cachedAvatar; img.style.display = ''; if(initials) initials.style.display = 'none'; }
    fetchProfileImage(session.webId).then(url => {
      if(!url) return;
      try { localStorage.setItem('catalog.cachedAvatar', url); } catch(e){}
      if(img){ img.src = url; img.style.display = ''; }
      if(initials) initials.style.display = 'none';
    });
  } else {
    // Logged out: drop the cached identity so we don't flash a stale avatar.
    try { localStorage.removeItem('catalog.cachedWebId'); localStorage.removeItem('catalog.cachedAvatar'); } catch(e){}
  }
}

function buildAvatarMenu(){
  const wrap = document.createElement('div');
  wrap.className = 'nav-account';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-avatar';
  btn.setAttribute('aria-label', 'Account menu');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  const img = document.createElement('img');
  img.alt = '';
  img.style.display = 'none';
  const initials = document.createElement('span');
  initials.className = 'nav-avatar-initials';
  if(session && session.webId){
    initials.textContent = avatarInitials(session.webId);
  } else {
    // Logged out: show a Lucide menu icon instead of a glyph.
    initials.innerHTML = '<i data-lucide="menu"></i>';
  }
  btn.appendChild(img);
  btn.appendChild(initials);

  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  menu.hidden = true;

  if(session && session.webId){
    const webIdItem = document.createElement('a');
    webIdItem.className = 'nav-menu-item nav-menu-webid';
    webIdItem.href = session.webId;
    webIdItem.target = '_blank';
    webIdItem.rel = 'noopener';
    webIdItem.textContent = shortWebId(session.webId);
    webIdItem.title = session.webId;
    menu.appendChild(webIdItem);
    const divider0 = document.createElement('div'); divider0.className = 'nav-menu-divider'; menu.appendChild(divider0);
  }

  const navItems = [
    { href: '/drafts',      label: 'Drafts',        count: draftCount() },
    { href: '/edits',       label: 'Edit requests', count: editRequestCount() },
    { href: '/submissions', label: 'Submissions',   count: null },
    { href: '/flags',       label: 'Flags',         count: flagCount(), variant: 'danger' },
  ];
  for(const item of navItems){
    const a = document.createElement('a');
    a.className = 'nav-menu-item nav-menu-link' + (item.variant ? ' nav-menu-' + item.variant : '');
    a.href = item.href;
    a.textContent = item.label;
    if(item.count != null && item.count > 0){
      const badge = document.createElement('span');
      badge.className = 'nav-menu-badge';
      badge.textContent = item.count;
      a.appendChild(badge);
    }
    menu.appendChild(a);
  }
  const aboutItem = document.createElement('button');
  aboutItem.type = 'button';
  aboutItem.className = 'nav-menu-item nav-menu-link';
  aboutItem.textContent = 'About';
  aboutItem.addEventListener('click', () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    window.showAbout?.();
  });
  menu.appendChild(aboutItem);
  const divider1 = document.createElement('div'); divider1.className = 'nav-menu-divider'; menu.appendChild(divider1);

  const filterLabel = document.createElement('label');
  filterLabel.className = 'nav-menu-item nav-menu-filter';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = getOnlyWithLink();
  cb.addEventListener('change', () => setOnlyWithLink(cb.checked));
  filterLabel.appendChild(cb);
  filterLabel.appendChild(document.createTextNode(' Only show items with a link'));
  menu.appendChild(filterLabel);

  const mineLabel = document.createElement('label');
  mineLabel.className = 'nav-menu-item nav-menu-filter';
  const mineCb = document.createElement('input');
  mineCb.type = 'checkbox';
  mineCb.checked = getShowMine();
  mineCb.addEventListener('change', () => setShowMine(mineCb.checked));
  mineLabel.appendChild(mineCb);
  mineLabel.appendChild(document.createTextNode(' Show my un-published changes'));
  menu.appendChild(mineLabel);

  const othersLabel = document.createElement('label');
  othersLabel.className = 'nav-menu-item nav-menu-filter';
  const othersCb = document.createElement('input');
  othersCb.type = 'checkbox';
  othersCb.checked = getShowOthers();
  othersCb.addEventListener('change', () => setShowOthers(othersCb.checked));
  othersLabel.appendChild(othersCb);
  othersLabel.appendChild(document.createTextNode(' Show others’ pending submissions'));
  menu.appendChild(othersLabel);

  const flagLabel = document.createElement('label');
  flagLabel.className = 'nav-menu-item nav-menu-filter';
  const flagCb = document.createElement('input');
  flagCb.type = 'checkbox';
  flagCb.checked = getHideFlagged();
  flagCb.addEventListener('change', () => setHideFlagged(flagCb.checked));
  flagLabel.appendChild(flagCb);
  flagLabel.appendChild(document.createTextNode(' Hide flagged items from lists'));
  menu.appendChild(flagLabel);

  if(session && session.isActive){
    const divider2 = document.createElement('div'); divider2.className = 'nav-menu-divider'; menu.appendChild(divider2);
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'nav-menu-item nav-menu-logout';
    logoutBtn.textContent = 'Log out';
    logoutBtn.addEventListener('click', () => { logout().catch(console.error); });
    menu.appendChild(logoutBtn);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !menu.hidden;
    menu.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (e) => {
    if(!wrap.contains(e.target) && !menu.hidden){
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && !menu.hidden){
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  wrap.appendChild(btn);
  wrap.appendChild(menu);
  return wrap;
}

function avatarInitials(webId){
  if(!webId) return '☰';
  try {
    const u = new URL(webId);
    const seg = (u.pathname.split('/').filter(Boolean)[0] || u.host).slice(0,2);
    return seg.toUpperCase();
  } catch { return '?'; }
}

async function fetchProfileImage(webId){
  if(!webId) return '';
  try {
    const profileUrl = webId.split('#')[0];
    const resp = await fetch(profileUrl, { headers: { Accept: 'text/turtle, application/ld+json;q=0.9, */*;q=0.5' } });
    if(!resp.ok) return '';
    const text = await resp.text();
    // Quick regex match for common image predicates in turtle or JSON-LD.
    const match = text.match(/(?:foaf:img|vcard:hasPhoto|<http:\/\/xmlns\.com\/foaf\/0\.1\/img>|<http:\/\/www\.w3\.org\/2006\/vcard\/ns#hasPhoto>|"image"\s*:|"foaf:img"\s*:|"hasPhoto"\s*:)\s*[<"]?([^"<>\s,]+)/i);
    if(match && match[1]) return new URL(match[1], profileUrl).toString();
  } catch(e){
    // fall through
  }
  return '';
}

function shortWebId(webId){
  if(!webId) return 'logged in';
  try { return new URL(webId).host; } catch { return webId; }
}

async function login(){
  const idp = window.prompt('Solid identity provider (issuer URL):', getStoredIdp());
  if(!idp) return;
  setStoredIdp(idp);
  try {
    const s = await ensureSession();
    await s.login(idp, redirectUri());
  } catch(e){
    console.error('Login failed:', e);
    notifyError(e?.message || String(e), 'Login failed to start');
  }
}
async function logout(){
  if(!session) return;
  try { await session.logout(); } catch(e){ console.warn('Logout error:', e); }
}

// Runs immediately on module load (before mashlib initializes auth).
async function handleRedirectIfPresent(){
  const params = new URLSearchParams(location.search);
  if(!(params.has('code') && params.has('state'))) return;
  try {
    const s = await ensureSession();
    await s.handleRedirectFromLogin();
    params.delete('code'); params.delete('state'); params.delete('iss');
    const clean = location.pathname + (params.toString() ? `?${params}` : '') + location.hash;
    history.replaceState(null, '', clean);
    onSessionStateChange();
  } catch(e){
    console.error('Login redirect handling failed:', e);
    // Clear stale state so retry starts clean.
    try {
      ['idp','jwks_uri','token_endpoint','client_id','pkce_code_verifier','csrf_token'].forEach(k => sessionStorage.removeItem(k));
      indexedDB.deleteDatabase('SessionIDB');
    } catch(_){}
    params.delete('code'); params.delete('state'); params.delete('iss');
    const clean = location.pathname + (params.toString() ? `?${params}` : '') + location.hash;
    history.replaceState(null, '', clean);
    notifyError((e?.message || String(e)) + '\nSession cache cleared — please log in again.', 'Login redirect failed');
  }
}

export async function initAuth(){
  await redirectInFlight;
  // Refresh menu badges whenever counts change.
  for(const evt of ['catalog-drafts-changed','catalog-editrequests-changed','catalog-flags-changed']){
    document.addEventListener(evt, renderAuthUi);
  }
  // If we have a cached logged-in identity, the inline injector already painted
  // the avatar. Don't render Login/Sign-Up first (it would flash); wait until
  // the session restore resolves and render once.
  let hadCachedSession = false;
  try { hadCachedSession = !!localStorage.getItem('catalog.cachedWebId'); } catch(e){}
  if(!hadCachedSession){
    renderAuthUi();
  }
  // Restore previous session from IndexedDB so refresh / navigation persists login.
  if(!session){
    try {
      const s = await ensureSession();
      if(typeof s.restore === 'function'){
        await s.restore();
      }
    } catch(e){
      // No previous session, that's fine.
    }
  }
  renderAuthUi();
}
