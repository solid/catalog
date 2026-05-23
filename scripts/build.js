#!/usr/bin/env node
// Assemble the deployable site into ./dist.
// Copies the static catalog files plus the npm packages we resolve via
// import map at runtime (lit + lucide). solid-ui's compiled Button.js is
// vendored under viewer/vendor/, so we don't need solid-ui in node_modules.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

async function rimraf(p){
  try { await fs.rm(p, { recursive: true, force: true }); } catch {}
}

async function copyTree(src, dest){
  const stat = await fs.stat(src);
  if(stat.isDirectory()){
    await fs.mkdir(dest, { recursive: true });
    for(const entry of await fs.readdir(src)){
      await copyTree(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function copyOptional(rel){
  const src = path.join(root, rel);
  try { await fs.access(src); } catch { return false; }
  await copyTree(src, path.join(dist, rel));
  return true;
}

async function copyDep(name){
  const src = path.join(root, 'node_modules', name);
  const dest = path.join(dist, 'node_modules', name);
  try { await fs.access(src); }
  catch {
    console.warn(`[build] skipping ${name} (not installed)`);
    return;
  }
  await copyTree(src, dest);
}

async function main(){
  console.log('[build] cleaning dist');
  await rimraf(dist);
  await fs.mkdir(dist, { recursive: true });

  console.log('[build] copying static files');
  // Top-level files used by the app.
  for(const f of [
    'index.html',
    'catalog-data.ttl',
    'catalog-shacl.ttl',
    'catalog-skos.ttl',
    'catalog-about.html',
    'manifest.webmanifest',
    'sw.js',
  ]){
    await copyOptional(f);
  }
  // Directories.
  for(const d of ['viewer', 'assets']){
    await copyOptional(d);
  }

  console.log('[build] copying runtime npm packages');
  // Lit + dependencies referenced by the import map.
  await copyDep('lit');
  await copyDep('lit-html');
  await copyDep('lit-element');
  await copyDep('@lit/reactive-element');
  // Lucide icons.
  await copyDep('lucide');

  console.log('[build] done → ' + path.relative(process.cwd(), dist));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
