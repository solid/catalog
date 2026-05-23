// Replacements for window.alert / confirm / prompt that render as proper
// in-page modals matching the catalog's modal chrome.

function ensureRoot(){
  let root = document.getElementById('notify-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'notify-root';
    document.body.appendChild(root);
  }
  return root;
}

function buildModal({ title, body, variant = 'info', buttons }){
  const root = ensureRoot();
  return new Promise(resolve => {
    const scrim = document.createElement('div');
    scrim.className = 'notify-scrim';
    const panel = document.createElement('div');
    panel.className = 'notify-panel notify-' + variant;
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label','Close');
    closeBtn.textContent = '✕';
    panel.appendChild(closeBtn);

    if(title){
      const h = document.createElement('h2');
      h.className = 'notify-title';
      h.textContent = title;
      panel.appendChild(h);
    }
    if(body){
      const p = document.createElement('p');
      p.className = 'notify-body';
      p.textContent = body;
      panel.appendChild(p);
    }

    const actions = document.createElement('div');
    actions.className = 'notify-actions';
    for(const btn of buttons){
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = btn.label;
      if(btn.kind) b.className = 'notify-btn-' + btn.kind;
      b.addEventListener('click', () => {
        cleanup();
        resolve(btn.value);
      });
      actions.appendChild(b);
    }
    panel.appendChild(actions);

    function cleanup(){
      document.removeEventListener('keydown', onKey);
      scrim.remove();
    }
    function onKey(e){
      if(e.key === 'Escape'){ cleanup(); resolve(undefined); }
      else if(e.key === 'Enter'){
        const primary = buttons.find(b => b.primary) || buttons[buttons.length - 1];
        cleanup();
        resolve(primary?.value);
      }
    }
    closeBtn.addEventListener('click', () => { cleanup(); resolve(undefined); });
    scrim.addEventListener('click', (e) => { if(e.target === scrim){ cleanup(); resolve(undefined); } });
    document.addEventListener('keydown', onKey);

    scrim.appendChild(panel);
    root.appendChild(scrim);
    // Focus the primary button so Enter/Escape work without an extra click.
    const primaryBtn = actions.querySelector('.notify-btn-primary') || actions.querySelector('button');
    if(primaryBtn) primaryBtn.focus();
  });
}

export function notify({ title, body, variant = 'info', okLabel = 'OK' } = {}){
  return buildModal({
    title,
    body,
    variant,
    buttons: [{ label: okLabel, value: true, kind: 'primary', primary: true }],
  });
}
export function notifyError(body, title = 'Error'){
  return notify({ title, body, variant: 'error' });
}
export function notifySuccess(body, title = 'Done'){
  return notify({ title, body, variant: 'success' });
}
export function confirmDialog({ title, body, okLabel = 'OK', cancelLabel = 'Cancel', variant = 'info' } = {}){
  return buildModal({
    title,
    body,
    variant,
    buttons: [
      { label: cancelLabel, value: false },
      { label: okLabel, value: true, kind: 'primary', primary: true },
    ],
  });
}

/**
 * Generic form dialog. `fields` describes the inputs; resolves to a
 * { ...values } object on submit, or undefined on cancel.
 *
 *   await formDialog({
 *     title: 'Flag entry',
 *     submitLabel: 'Flag',
 *     fields: [
 *       { name: 'reason', label: 'Reason', type: 'select', options: [...] },
 *       { name: 'note', label: 'Note (optional)', type: 'textarea' },
 *     ],
 *   })
 */
export function formDialog({ title, body, fields = [], submitLabel = 'OK', cancelLabel = 'Cancel', variant = 'info' } = {}){
  const root = ensureRoot();
  return new Promise(resolve => {
    const scrim = document.createElement('div');
    scrim.className = 'notify-scrim';
    const panel = document.createElement('div');
    panel.className = 'notify-panel notify-' + variant + ' notify-form';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label','Close');
    closeBtn.textContent = '✕';
    panel.appendChild(closeBtn);

    if(title){
      const h = document.createElement('h2');
      h.className = 'notify-title';
      h.textContent = title;
      panel.appendChild(h);
    }
    if(body){
      const p = document.createElement('p');
      p.className = 'notify-body';
      p.textContent = body;
      panel.appendChild(p);
    }

    const form = document.createElement('form');
    form.className = 'notify-form-body';
    const inputs = {};
    for(const f of fields){
      const wrap = document.createElement('label');
      wrap.className = 'notify-field';
      const lbl = document.createElement('span');
      lbl.className = 'notify-field-label';
      lbl.textContent = f.label;
      wrap.appendChild(lbl);
      let input;
      if(f.type === 'select'){
        input = document.createElement('select');
        for(const opt of f.options || []){
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          input.appendChild(o);
        }
        if(f.value != null) input.value = f.value;
      } else if(f.type === 'textarea'){
        input = document.createElement('textarea');
        if(f.placeholder) input.placeholder = f.placeholder;
        if(f.value != null) input.value = f.value;
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        if(f.placeholder) input.placeholder = f.placeholder;
        if(f.value != null) input.value = f.value;
      }
      input.name = f.name;
      input.className = 'notify-field-input';
      wrap.appendChild(input);
      form.appendChild(wrap);
      inputs[f.name] = input;
      if(f.showWhen) wrap.dataset.showWhen = JSON.stringify(f.showWhen);
    }
    panel.appendChild(form);

    // Conditional visibility: fields with showWhen only appear when another
    // field has the specified value.
    const applyConditionalFields = () => {
      for(const f of fields){
        if(!f.showWhen) continue;
        const controller = inputs[f.showWhen.field];
        const wrapEl = inputs[f.name].closest('.notify-field');
        if(!controller || !wrapEl) continue;
        wrapEl.hidden = controller.value !== f.showWhen.value;
      }
    };
    for(const f of fields){
      if(f.showWhen && inputs[f.showWhen.field]){
        inputs[f.showWhen.field].addEventListener('change', applyConditionalFields);
        inputs[f.showWhen.field].addEventListener('input', applyConditionalFields);
      }
    }
    applyConditionalFields();

    const actions = document.createElement('div');
    actions.className = 'notify-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = cancelLabel;
    cancelBtn.addEventListener('click', () => { cleanup(); resolve(undefined); });
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.textContent = submitLabel;
    submitBtn.className = 'notify-btn-primary';
    submitBtn.addEventListener('click', () => {
      const values = {};
      for(const name of Object.keys(inputs)) values[name] = inputs[name].value;
      cleanup();
      resolve(values);
    });
    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);
    panel.appendChild(actions);

    function cleanup(){
      document.removeEventListener('keydown', onKey);
      scrim.remove();
    }
    function onKey(e){
      if(e.key === 'Escape'){ cleanup(); resolve(undefined); }
    }
    closeBtn.addEventListener('click', () => { cleanup(); resolve(undefined); });
    scrim.addEventListener('click', (e) => { if(e.target === scrim){ cleanup(); resolve(undefined); } });
    document.addEventListener('keydown', onKey);

    scrim.appendChild(panel);
    root.appendChild(scrim);
    const first = panel.querySelector('input, select, textarea');
    if(first) first.focus();
  });
}

// Lightweight non-blocking toast for confirmations (e.g. "saved").
export function toast(message, opts = {}){
  const root = ensureRoot();
  let bar = root.querySelector('.notify-toasts');
  if(!bar){
    bar = document.createElement('div');
    bar.className = 'notify-toasts';
    root.appendChild(bar);
  }
  const t = document.createElement('div');
  t.className = 'notify-toast' + (opts.variant ? ' notify-toast-' + opts.variant : '');
  t.textContent = message;
  bar.appendChild(t);
  setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 250); }, opts.duration || 2400);
}
