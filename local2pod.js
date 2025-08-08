import { SolidNodeClient } from "solid-node-client";
const client = new SolidNodeClient;

async function local2pod(){
  try {
    await client.login();
  }
  catch(e){ console.log(e); }
  for(let file of files){
    const from = `file:///home/jeff/solid/catalog/${file}`;
    const to   = `https://solidproject.solidcommunity.net/catalog/${file}`;
    try {
      const getResponse = await client.fetch(from);
      const content = await getResponse.text();
      const contentType = getResponse.headers.get('Content-type');
      const putResponse = await client.fetch( to, {
         method:"PUT",
         body:content,
         headers:{"content-type":contentType}
      });
      console.log(putResponse.status,to)
    }
    catch(e){ console.log(e); }
  }
}

const files = [
  'index.html',
  'catalog-data.ttl',
  'catalog-skos.ttl',
  'catalog-shacl.ttl',
  'assets/logo.svg',
  'viewer/form.js',
  'viewer/forms.css',
  'viewer/makeTOC.js',
  'viewer/page-content.js',
  'viewer/pages.js',
  'viewer/showRecord.js',
  'viewer/utils.js',
  'viewer/viewer.css',
  'viewer/viewer.html',
  'viewer/viewer.js',
];

local2pod();

