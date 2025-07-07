export const context = {
  // prefixes
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  con: "https://solidproject.solidcommunity.net/catalog/taxonomy#",
  cdata: "https://solidproject.solidcommunity.net/catalog/data#",
  ex: "http://example.org#",

  // no @
  id: "@id",
  type: "@type",

  // ex: Class
  Person: { "@type": "@id", "@id": "ex:Person" },
  CreativeWork: { "@type": "@id", "@id": "ex:CreativeWork" },
  Specification: { "@type": "@id", "@id": "ex:Specification" },

  // ex: ObjectProperty
  landingPage: { "@type": "@id", "@id": "ex:landingPage" },
  logo: { "@type": "@id", "@id": "ex:logo" },
  subType: { "@type": "@id", "@id": "ex:subType" },
  author: { "@type": "@id", "@id": "ex:author" },
  editor: { "@type": "@id", "@id": "ex:editor" },
  repository: { "@type": "@id", "@id": "ex:repository" },
  about: { "@type": "@id", "@id": "ex:about" },
  status: { "@type": "@id", "@id": "ex:status" },
  definesConformanceFor: { "@type": "@id", "@id": "ex:definesConformanceFor" },

  // ex: DataProperty
  name: {
    "@id": "ex:name",
    "@container": "@language"
  },
  description: {
    "@id": "ex:description",
    "@container": "@language"
  },

  // con:
  'con:Person': { "@type": "@id" },
  'con:Specification': { "@type": "@id" },
}
