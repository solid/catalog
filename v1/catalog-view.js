export default (r)=> { 
  return `
<div about="${r.id}" class="card" style="background:white;border:1px solid grey;margin:1rem; border-radius:0.2rem; display:inline-block; width:fit-content;height:fit-content;max-width:60ch;">
  <div class="header" style="background:#99c;padding:1em;">
    <div style="font-size:125%"><b> ${r.name||r.label||r.title}  </b>
       ${r.alternateName ?"("+r.alternateName+")" :""}
       ${r.preferredNamespacePrefix ?"("+r.preferredNamespacePrefix+")" :""}
    </div>
    <div style="font-size:90%"><i>${typeof r.type=='string' ?r.type :r.type.join(', ')}</i></div>
  </div>
  <div class="card-body">
      ${r.description ?"<p style='max-width:60ch'>"+r.description+"</p>" :""}
    <div class="row-wrapper">
      ${r.provider 
        ?"<div><span class='fieldLabel'>provider: </span>"+r.provider+"</div>" 
        :""
      }
      ${r.about 
        ?"<div><span class='fieldLabel'>about: </span>"+r.about+"</div>" 
        :""
      }
      ${r.actionApplication 
        ?"<div><span class='fieldLabel'>uses: </span>"+r.actionApplication+"</div>"
        :""
      }
      ${r.forumid
        ?"<div><span class='fieldLabel'>forum id: </span>"+r.forumid+"</div>" 
        :""
      }
      ${r.programming_language
        ?"<div><span class='fieldLabel'>programming language: </span>"+r.programming_language+"</div>"
        :""
      }
      ${r.platform
        ?"<div><span class='fieldLabel'>platform: </span>"+r.platform+"</div>"
        :""
      }
      ${r.license
        ?"<div><span class='fieldLabel'>license: </span>"+r.license+"</div>"
        :""
      }
      ${r.providerOf
        ?typeof r.providerOf==="string"
          ?"<div><span class='fieldLabel'>provider of: </span>"+r.providerOf.replace(/,/g,/, /)+"</div>" 
          :"<div><span class='fieldLabel'>provider of: </span>"+r.providerOf.join(', ')+"</div>" 
        :""
      }
      ${r.aboutOf
        ?typeof r.aboutOf==="string"
          ?"<div><span class='fieldLabel'>subject of: </span>"+r.aboutOf.replace(/,/g,/, /)+"</div>" 
          :"<div><span class='fieldLabel'>subject of: </span>"+r.aboutOf.join(', ')+"</div>" 
        :""
      }
      ${r.actionApplicationOf
        ?typeof r.actionApplicationOf=="string"
          ?"<div><span class='fieldLabel'>used by: </span>"+r.actionApplicationOf.replace(/,/g,/, /)+"</div>"
          :"<div><span class='fieldLabel'>used by: </span>"+r.actionApplicationOf.join(', ')+"</div>"
        :""
      }
    </div>
    <div class="card-links" style="margin:1rem;text-align:center;margin-bottom:1.25rem">
      ${r.service_endpoint}
      ${r.homepage}
      ${r.repository}
      ${r.videoCallPage}
      ${r.wiki}
      ${r.webid}
      ${r.preferredNamespaceURI}
    </div>
    <div style="text-align:right">
      ${r.keywords}
    </div>
  </div>
</div>
  `;
}
