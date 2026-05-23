// Lucide icon registration. Loads the npm package via the import map declared
// in index.html, then exposes a global `renderIcons()` that upgrades any
// `<i data-lucide="...">` placeholders in the current document.

import { createIcons, icons } from 'lucide';

export function renderIcons(root = document){
  try {
    createIcons({ icons, root });
  } catch(e){
    console.warn('Lucide renderIcons failed:', e);
  }
}

window.renderIcons = renderIcons;
// Upgrade any placeholders that are already in the DOM at module load time.
renderIcons();
