// "Publish log" — every time a user clicks Publish in the catalog, the form
// PUTs a Turtle file to the central pod folder at
//   https://solidproject.solidcommunity.net/catalog/new-data/
// which is an LDP BasicContainer. That folder is effectively the public
// submission inbox. This module fetches its listing and parses each entry.

const LOG_URL = 'https://solidproject.solidcommunity.net/catalog/new-data/';

export function publishLogUrl(){ return LOG_URL; }

/** Fetch the LDP listing and return entries sorted by most-recent first. */
export async function fetchPublishLog(){
  const resp = await fetch(LOG_URL, { headers: { Accept: 'text/turtle' } });
  if(!resp.ok) throw new Error(`Failed to fetch publish log: HTTP ${resp.status}`);
  const text = await resp.text();
  return parseContainerTurtle(text);
}

// In-memory cache so hover-prefetch and click share the same fetch promise.
const submissionCache = new Map();

/** Fetch the contents of a single submission (cached). Safe to call repeatedly. */
export function fetchSubmission(url){
  let p = submissionCache.get(url);
  if(p) return p;
  p = fetch(url, { headers: { Accept: 'text/turtle' } }).then(r => {
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }).catch(err => {
    submissionCache.delete(url); // allow retry on failure
    throw err;
  });
  submissionCache.set(url, p);
  return p;
}

/** Kick off a fetch and discard the result/errors — for hover preloading. */
export function prefetchSubmission(url){
  if(submissionCache.has(url)) return;
  fetchSubmission(url).catch(() => {});
}

function parseContainerTurtle(text){
  const entries = [];
  // Lines look like: <encoded-filename> a ldp:Resource, ... ; dc:modified "ISO"^^xsd:dateTime.
  // We split on `<filename> a ldp:Resource` blocks and pull the date.
  // Each resource is declared as `<filename> a ldp:Resource[, ...] ; dc:modified "ISO"^^xsd:dateTime .`
  // Use [\s\S] (any char) because the line between can contain URLs with dots.
  const blockRe = /<([^>]+)>\s+a\s+ldp:Resource[\s\S]*?dc:modified\s+"([^"]+)"\^\^xsd:dateTime/g;
  let m;
  while((m = blockRe.exec(text)) !== null){
    const raw = m[1];
    if(raw === '' || raw === '.' || raw.startsWith('http')) continue;
    let filename;
    try { filename = decodeURIComponent(decodeURIComponent(raw)); }
    catch { filename = raw; }
    const parsed = parseFilename(filename);
    entries.push({
      url: new URL(raw, LOG_URL).toString(),
      filename,
      modifiedAt: m[2],
      timestamp: parsed.timestamp || m[2],
      name: parsed.name || filename,
    });
  }
  entries.sort((a,b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return entries;
}

/** Splits "2026-05-08T15:03:24.589Z-Niko_Bonnieure.ttl" into {timestamp, name}. */
function parseFilename(filename){
  const m = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)-(.+?)(?:\.ttl)?$/i);
  if(!m) return { timestamp: '', name: filename.replace(/\.ttl$/i, '') };
  return { timestamp: m[1], name: m[2].replace(/_/g, ' ') };
}

/** Best-effort: extract the record's name + landing page from a submission turtle. */
export function summariseSubmission(turtle){
  const all = parseSubmissionFields(turtle);
  return {
    name: all.name || '',
    description: all.description || '',
    landingPage: all.landingPage || '',
    repository: all.repository || '',
  };
}

/**
 * Parse every `ex:<key> <value>` pair from a submission turtle into a plain
 * { key: value } object. Used for building a diff against the existing record.
 * Form.js emits turtle with a known shape (one subject, triple-quoted strings
 * for free text, angle brackets for URIs, `con:` prefix for SKOS concepts), so
 * a regex is sufficient.
 */
export function parseSubmissionFields(turtle){
  const out = {};
  const re = /\bex:(\w+)\s+(?:"""([\s\S]*?)"""|"([^"]*)"|<([^>]+)>|(con:[\w-]+))/g;
  let m;
  while((m = re.exec(turtle)) !== null){
    const key = m[1];
    const value = (m[2] ?? m[3] ?? m[4] ?? m[5] ?? '').trim();
    if(!value) continue;
    if(out[key]){
      // Multiple values for same predicate → join with comma.
      out[key] = out[key] + ', ' + value;
    } else {
      out[key] = value;
    }
  }
  return out;
}
