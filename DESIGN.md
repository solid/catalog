# Notes for catalog v2

## Features of V2
* clickable tree of resource types with number of records in each
* on each record 
    * bi-directional links (e.g. provider <-> product, service <-> serviceBackend)
    * links to off-site (repos,services,etc)
    * links from keyword on a record to other records with same keyword
* keyword index
* full text search
* edit records directly from viewer
* forms to add records for each major resource type
* can go direct to a record search from location bar ?search=term


## This folder contains

* catalog-data.ttl - the main data file aggregated from ./data/*
* catalog-shacl.ttl - the main SHACL file  aggregated from ./shacl/*
* catalog-skos.ttl - the main SKOS controlled vocabulary concept scheme

## The ./new-data folder contains

Edited records stored one file per record. Eventually we will patch to the main data file.

## Status of data classes is shown below.

An `X` indicates the file for that class is fully migrated to v2 format. A `~` indicates the file is partially migrated to the v2 format. Only portions that have been migrated are used by the form generator. 
 
  | CLASS            | SHACL | DATA
  | -----------------|-------|------
  | Service          |   X   |  X
  | Product          |   X   |  X
  | Organization     |   X   |  X
  | Person           |   X   |  X
  | LearningResource |   X   |  X
  | Event            |   X   |  X
  | Ontology         |   X   |  X
  | Specification    |   X   |  X


## Some caveats about v2:

* Terms are currently in the `ex:` namespace.  When we have decided on the actual namespaces & predicates we can swap them in.
* Fields like `domainKeyword` are currently strings but will be swapped for URLs when we have a better idea of what we want.

## The form generator works like this :

* the subject, predicates, and datatypes for a record are stored in form field HTML attributes
* the `sh:path` of each property (minus its namespace) is used as the form field label
* the `sh:description` of each property that has one is used as the form field instructions prompt 
* a property with `sh:or` is treated as an HTML `select` dropdown generated from the skos:prefabel in ./catalog-skos.ttl
* a proprty with `sh:maxLength` greater than 80 is treated as a textarea
* a property with `sh:datatype xsd:anyURI` is treated as a URL input field ;
* all other properties are treated as text input fields
* a property with both `sh:minCount 1` and `sh:maxCount 1` is treated as a required field
* other than checking that required fields are filled in, no validation is done


