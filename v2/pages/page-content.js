export const pageContent = {
  recordSearch : `
<sol-login></sol-login>
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
<div class="searchPage">
  <div style="color:yellow"><b>Solid Resources Catalog</b> New Record Menu</div>
<header>
<p>Use the form below to indicate what type of new record you want to create.</p>
</header>

  <select id="recordTypeChooser"></select>
  &nbsp;&nbsp;<button id="createRecordButton"> create new record of this type </button>
  &nbsp;&nbsp;<button id="cancelButton"> cancel </button>

<p>
<b>Notes:</b><ul>
<li>A <b>Service</b> includes deployed identity &/or storage servers and also communication services like chats & forums.</li>
<li>An <b>Organization</b> includes an informal coding group like the SolidOS Coding Group.</li>
<li><b>Learning Resources</b> include primers, tutorials, use cases, and test result reports.</li>
<ul></p>
`,
}
