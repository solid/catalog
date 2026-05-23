import {findRecord,findPrefLabel,source,showPage} from './utils.js';
import {showRecordsByKeyword} from './viewer.js';
import {renderIcons} from './icons.js';
import {addFlag, flagsForSubject, FLAG_REASONS, reasonLabel} from './flags.js';
import {formDialog, toast} from './notify.js';
import {listTestReports, addTestReport, removeTestReport, relativeTime, SOLID_SERVERS, TEST_DEPTHS, TEST_RESULTS, depthLabel, resultLabel} from './testReports.js';

// Set when navigating via the in-sheet back button, so we don't push the
// record we're leaving back onto the stack.
let navigatingBack = false;

export function showRecord(display,subject,record){
  record ||= findRecord(subject);
  // Maintain a back-stack for navigation between records inside the sheet.
  const isSheet = display && display.id === 'right-bottom';
  if(isSheet){
    if(!display._sheetStack) display._sheetStack = [];
    const prev = display.dataset.recordSubject;
    if(navigatingBack){
      navigatingBack = false;
    } else if(prev && prev !== subject){
      display._sheetStack.push(prev);
    }
  }
  let div = document.createElement('div');
  div.classList.add('record');
  display.innerHTML="";
  display.appendChild(div);
  let dependencyStr = "";
  let str = makeRecordHeader(subject,record, isSheet && display._sheetStack.length > 0);
  for(let f of Object.keys(record)){
    if( recordDisplayFieldsToSkip(f) ) continue;
    let label = f.replace(/aboutOf/,'is referenced in');
    if(f=="contactEmail") str += recordDisplayEmail(f,record[f]);
    else if(f.match(/softwareStackIncludesOf|hasDependencyOnOf|hasDependencyOn|conformsToOf|definesConformanceForOf|conformsTo/)){
      dependencyStr += recordDisplaySoftwareRelations(f,record[f]);
    }
    else str += recordDisplayMakeDiv(label,record[f]);
  }
  str += recordDisplayLinks(record);
  str += recordDisplayTestReports(subject);
  div.innerHTML = str + dependencyStr;
  if(isSheet) display.dataset.recordSubject = subject;
  addRecordListeners(display, subject);
  renderIcons();
}

function makeRecordHeader(subject,record,showBack){
  let displayType = [] ;
  let type = record.subType;
  if(!type) type = record.type;
  for(let d of type){
    displayType.push( findPrefLabel( d ) );
  }
  displayType = displayType.join(', ');
  const existingFlags = flagsForSubject(subject);
  const flagBadge = existingFlags.length
    ? `<span class="record-flag-badge" title="${existingFlags.length} flag${existingFlags.length===1?'':'s'}">⚑ ${existingFlags.length}</span>`
    : '';
  const backBtn = showBack
    ? `<button type="button" class="record-back-button" aria-label="Back"><i data-lucide="arrow-left"></i></button>`
    : '';
  let str = `
      <div class="record-header">
        ${backBtn}
        <b class="record-name">${record.name}</b>
        <div class="record-header-actions">
          ${flagBadge}
          <div class="record-menu">
            <button type="button" class="record-menu-trigger" aria-label="More actions" aria-haspopup="true" aria-expanded="false">⋯</button>
            <div class="record-menu-list" hidden>
              <a class="edit-button record-menu-item" href="${subject}">Edit</a>
              <button type="button" class="flag-button record-menu-item" data-subject="${subject}">Flag</button>
            </div>
          </div>
        </div>
      </div>
      <div class="record-type">${displayType}</div>`
  if(record.socialKeyword||record.technicalKeyword){
    str += `<div class="keywords">keywords: `;
    str += (record.socialKeyword || "") + (record.technicalKeyword ||"");
    str += `</div>`;
  }
  str += `</p><p>${record.description||""}</p>`;
  if(record.logo) str+= `<img src="${record.logo}" alt="logo">`;
  return str;
}
function linkWithIcon(href, icon, label){
  return `<a href="${href}" target="_BLANK" class="record-link"><i data-lucide="${icon}" class="record-link-icon"></i><span>${label}</span></a>`;
}
function recordDisplayLinks(record){
  let s = `<p class="record-links">`;
  if(record.webid) s += linkWithIcon(record.webid, 'user', 'WebID profile');
  if(record.repository){
    const isGithub = /^https?:\/\/(www\.)?github\.com\//i.test(record.repository);
    if(isGithub){
      const gh = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true" class="record-link-icon-svg"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.37-.93-.9-1.18-.9-1.18-.74-.5.06-.49.06-.49.81.06 1.24.84 1.24.84.72 1.24 1.9.89 2.36.68.07-.52.28-.88.5-1.08-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.22 2.2.82A7.6 7.6 0 0 1 8 4.2c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;
      s += `<a href="${record.repository}" target="_BLANK" class="record-link"><span class="record-link-icon">${gh}</span><span>Repository</span></a>`;
    } else {
      s += linkWithIcon(record.repository, 'git-branch', 'Repository');
    }
  }
  if(record.videoCallPage) s += linkWithIcon(record.videoCallPage, 'video', 'Video Call Link');
  if(record.showcase) s += linkWithIcon(record.showcase, 'monitor-play', 'Live Demo / WebApp');
  if(record.serviceEndpoint) s += linkWithIcon(record.serviceEndpoint, 'server', 'Service Endpoint');
  if(record.landingPage) s += linkWithIcon(record.landingPage, 'external-link', 'Landing Page');
  return s + '</p>';
}
function recordDisplaySoftwareRelations(label,value){
  label = label.replace(/conforms toOf/,'conforms to');
  label = label.replace(/softwareStackIncludesOf/,'is used by');
  label = label.replace(/hasDependencyOnOf/,'is dependency of');
  label = label.replace(/hasDependencyOn/,'has dependency on');
  label = label.replace(/conformsToOf/,'is conformed to by');
  label = label.replace(/definesConformanceForOf/,'is defined in');
  return recordDisplayMakeDiv(label,value)
}
function recordDisplayEmail(label,value){
  let val = (value.match(/^mailto:/)) ?value :`mailto:${value}`
  val = `<a href="${val}" target="_BLANK">${val}</a>`;
  return recordDisplayMakeDiv("contact email",val)
}
function recordDisplayMakeDiv(label,value){
  return `
    <div class="field">
      <b class="fieldName">${label}</b> <span class="fieldValue">${value}</span>
    </div>
  `;
}
function recordDisplayFieldsToSkip(label){
    return label.match(/(name|subType|type|description|keyword|landingPage|serviceEndpoint|socialKeyword|technicalKeyword|clientid|videoCallPage|repository|logo|showcase)/i);
}
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function recordDisplayTestReports(subject){
  const reports = listTestReports(subject);
  let s = `<div class="test-reports">
      <div class="test-reports-head">
        <span class="test-reports-title">Tested with</span>
        <button type="button" class="test-report-add">+ Add report</button>
      </div>`;
  if(!reports.length){
    s += `<p class="test-reports-empty">No compatibility reports yet. Tested this app against a Solid server? Add one.</p>`;
  } else {
    s += `<ul class="test-reports-list">`;
    for(const r of reports){
      const server = escapeHtml(r.serverUrl && r.server === 'Other' ? r.serverUrl : r.server);
      const version = r.version ? ` <span class="test-report-version">v${escapeHtml(r.version)}</span>` : '';
      const who = r.webid ? ` · ${escapeHtml((()=>{try{return new URL(r.webid).host}catch{return r.webid}})())}` : '';
      const result = r.result ? `<span class="test-report-result result-${escapeHtml(r.result)}">${escapeHtml(resultLabel(r.result))}</span>` : '';
      const depth = r.testType ? `<span class="test-report-depth">${escapeHtml(depthLabel(r.testType))}</span>` : '';
      s += `<li class="test-report" data-id="${r.id}">
          <div class="test-report-row">
            <span class="test-report-server">${server}</span>${version}
            <button type="button" class="test-report-remove" data-id="${r.id}" aria-label="Remove report">✕</button>
          </div>
          <div class="test-report-tags">${result}${depth}</div>
          <span class="test-report-meta">${escapeHtml(relativeTime(r.createdAt))}${who}</span>
        </li>`;
    }
    s += `</ul>`;
  }
  s += `</div>`;
  return s;
}
function addRecordListeners(display, subject){
  /* in-sheet back button */
  const backBtn = display.querySelector('.record-back-button');
  if(backBtn){
    backBtn.addEventListener('click', () => {
      const stack = display._sheetStack || [];
      const prev = stack.pop();
      if(prev){ navigatingBack = true; showRecord(display, prev); }
    });
  }
  /* test-report add + remove */
  const addBtn = display.querySelector('.test-report-add');
  if(addBtn){
    addBtn.addEventListener('click', async () => {
      const values = await formDialog({
        title: 'Add compatibility report',
        body: 'Record which Solid server you tested this app against.',
        submitLabel: 'Add report',
        fields: [
          { name: 'server', label: 'Solid server', type: 'select', options: SOLID_SERVERS },
          { name: 'serverUrl', label: 'Custom server', type: 'text', placeholder: 'e.g. https://my-pod.example', showWhen: { field: 'server', value: 'Other' } },
          { name: 'version', label: 'Version (optional)', type: 'text', placeholder: 'e.g. 7.1.3' },
          { name: 'testType', label: 'Type of test', type: 'select', options: TEST_DEPTHS },
          { name: 'result', label: 'Result', type: 'select', options: TEST_RESULTS },
        ],
      });
      if(!values || !values.server) return;
      if(values.server === 'Other' && !values.serverUrl){
        toast('Enter a custom server URL.');
        return;
      }
      addTestReport({
        subject,
        server: values.server,
        serverUrl: values.serverUrl,
        version: values.version,
        testType: values.testType,
        result: values.result,
        webId: window.solidSession?.webId || '',
      });
      toast('Report added');
      showRecord(display, subject);
    });
  }
  for(const rm of display.querySelectorAll('.test-report-remove')){
    rm.addEventListener('click', () => {
      removeTestReport(rm.getAttribute('data-id'));
      showRecord(display, subject);
    });
  }
  /* kebab (3-dot) menu toggle */
  /* kebab (3-dot) menu toggle */
  const menuTrigger = display.querySelector('.record-menu-trigger');
  const menuList = display.querySelector('.record-menu-list');
  if(menuTrigger && menuList){
    menuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menuList.hidden;
      menuList.hidden = !open;
      menuTrigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if(!menuList.hidden && !e.target.closest('.record-menu')){
        menuList.hidden = true;
        menuTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  /* field link listeners  */
  let fieldAnchors = display.querySelectorAll('.field a');
  for(let fa of fieldAnchors){
    if(fa.getAttribute('target')) continue;
    fa.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecord(display,e.target.getAttribute('href'));
    });
  }
  /* keyword listeners */
  let keyAnchors = display.querySelectorAll('.keywords a');
  for(let ka of keyAnchors){
    ka.addEventListener('click',(e)=> {
      e.preventDefault();
      showRecordsByKeyword(e.target.getAttribute('href'));
    });
  }
  /* edit button listener  */
  let button = display.querySelector('.edit-button');
  button.addEventListener('click',(e)=> {
    e.preventDefault();
    const id = e.target.getAttribute('href');
    showPage('record', {id});
  });
  /* flag button listener */
  const flagBtn = display.querySelector('.flag-button');
  if(flagBtn){
    flagBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const subj = flagBtn.getAttribute('data-subject');
      const recordName = display.querySelector('.record-name')?.textContent || '';
      const values = await formDialog({
        title: `Flag “${recordName || subj}”`,
        body: 'Stored locally for now; nothing is sent. Maintainers can review the local list at /flags.',
        submitLabel: 'Flag this entry',
        cancelLabel: 'Cancel',
        variant: 'error',
        fields: [
          { name: 'reason', label: 'Reason', type: 'select', options: FLAG_REASONS },
          { name: 'note', label: 'Note (optional)', type: 'textarea', placeholder: 'e.g. 404 on the landing page since last month' },
        ],
      });
      if(!values) return;
      addFlag({
        subject: subj,
        label: recordName,
        reason: values.reason,
        note: values.note,
        webId: window.solidSession?.webId || '',
      });
      toast(`Flagged as “${reasonLabel(values.reason)}”`);
      // Re-render the record so the badge updates immediately.
      showRecord(display, subj);
    });
  }
  const images = display.querySelectorAll('img');
  images.forEach(img => {
    img.onerror = function() {
      this.style.display="none";
    };
  });
}

