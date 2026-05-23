#!/usr/bin/env node
// Minimal static dev server with SPA fallback.
// Serves files from the project root; for any GET that does not resolve
// to an existing file (e.g. /apps, /learning), responds with index.html.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.ttl':  'text/turtle; charset=utf-8',
  '.shce': 'text/plain; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function safeJoin(base, p){
  const target = path.normalize(path.join(base, p));
  if(!target.startsWith(base)) return null;
  return target;
}

function send(res, status, body, type='text/plain; charset=utf-8'){
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const decoded = decodeURIComponent(url.pathname);
    const target = safeJoin(root, decoded);
    if(!target){ return send(res, 400, 'Bad path'); }

    fs.stat(target, (err, stat) => {
      if(!err && stat.isFile()){
        const ext = path.extname(target).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        fs.createReadStream(target).pipe(res);
        return;
      }
      // SPA fallback: serve index.html ONLY for top-level app routes (no `.`
      // in the last segment, and not under /node_modules or /viewer where a
      // missing file is a real 404). This avoids masking bad ESM imports.
      const last = decoded.split('/').pop() || '';
      const isAssetPath = decoded.startsWith('/node_modules/') ||
                          decoded.startsWith('/viewer/') ||
                          decoded.startsWith('/assets/');
      if(!last.includes('.') && !isAssetPath){
        const idx = path.join(root, 'index.html');
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
        fs.createReadStream(idx).pipe(res);
        return;
      }
      send(res, 404, 'Not found: ' + decoded);
    });
  } catch(e){
    send(res, 500, String(e));
  }
});

server.listen(port, () => {
  console.log(`Solid Resources Catalog dev server: http://localhost:${port}/`);
});
