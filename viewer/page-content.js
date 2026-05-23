export const pageContent = {
  recordSearch : `
<!-- <sol-login></sol-login> -->
<div id="searchPage">
  <div style="color:yellow"><b>Solid Resources Catalog</b> Record Search Menu</div>
  <header>
    <p>Use the form below to check if there are already records for you, your organization, or products & services you work on.</p>
    <p>If you find records, select to edit.<p>
    <p>If  you don't find a record, click here to <button id="createNewButton">create a new record</button></p>
  </header>
    <input id="searchForm" type="text" width:"80ch" placeholder="person, organization, service, or product to search for" />
    <button id="searchButton">search!</button>
    <div id="display"></div>
</div>
<div id="iframeDisplay" src=""></div>
`,
  typeChooser:`
<div class="searchPage" style="padding:1em;">
  <div style="color:var(--link)"><b>Solid Resources Catalog</b> &mdash; New Record</div>
<header>
<p>Start by pasting a link to the resource (e.g., its homepage, repo, or landing page). Then pick a type.</p>
</header>

  <div style="margin-bottom:0.75em;">
    <label for="newRecordLanding" style="display:block;margin-bottom:0.25em;"><b>Landing page URL</b></label>
    <input id="newRecordLanding" type="url" placeholder="https://example.org/your-project" style="width:100%;max-width:60ch;padding:0.4em;border-radius:0.4em;background:var(--bg-search);color:var(--text);border:1px solid var(--border);" />
  </div>

  <div style="margin-bottom:0.75em;">
    <label for="recordTypeChooser" style="display:block;margin-bottom:0.25em;"><b>Type</b></label>
    <select id="recordTypeChooser"></select>
  </div>

  <button id="createRecordButton"> create new record </button>

<p>
<b>Notes:</b><ul>
<li>If you or your organization create a product, mark yourself or the organization as "provider" on the product form rather than your own form. Viewers should automatically display that on your own page since links are bi-directional.
<li>A <b>Service</b> includes deployed identity &/or storage servers and also communication services like chats & forums.</li>
<li>An <b>Organization</b> includes an informal coding group like the SolidOS Coding Group.</li>
<li><b>Learning Resources</b> include primers, tutorials, use cases, and test result reports.</li>
<ul></p>
`,
}
