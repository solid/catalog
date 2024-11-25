# Solid Resources Catalog

-- a listing of things useful to the Solid Community

## Overview

The purpose of this project is to create and make public a comprehensive listing of people, organizations, products, services, and events useful to people wanting to learn about, use, create, or promote the Solid software ecosystyem.  Data will be kept in RDF as described in this repo and can therefore be reused by multiple applications.  Two initial applications are in progress. [Solid Catalog](https://github.com/solid-contrib/catalog) is an app to display a searchable version of the catalog on the Solid Project website and pod. [Solid Efforts](https://github.com/elf-pavlik/solid-efforts) is an app intended to support exploration of the interal links between the Solid Specifications and other parts of the Solid ecosystem. 

**Note** This is a work in progress, please do not take any of the data presented as representative of the people, organizations, and software listed - the data has not been vetted.  And please don't send corrections yet. Once the initial issues listed below have been at least preliminarily solved, we'll make a call for corrections and additions.

## Long Term Goals

While the catalog will start as a single hard-coded RDF document, the goal is to eventually support aggregation of data from other sources.  Personal, organizational, and software client WebID profiles contain data relevant to the catalog.  For assets without WebID profiles, we can encourage all projects to have a "README.ttl" - its own catalog entry describing itself which can be imported to aggregating catalogs.

Until an aggregating process is in place, and even after it, there will need to be a way to update the catalog manually.  Initially, that will be through submitting PRs to this repo.  Eventually, we can explore Solid forms to support direct editing on the pod.

The task of cataloging resources is shared by most organizations so a long term goal of this project is to create reusable shapes which can be formalized into client-to-client specifications and to document the process of creating the catalog and using the shapes so that other organizations don't have to reinvent the wheel.

## Scope

In order to limit the work of updating the catalog, records are designed to cover only the basics - what type of thing is it? what is its name and brief description? who made it? what other things is it related to? how can I find out more?  The catalog record is not like a full WebID or ClientID profile - it covers the basics and points to those types of documents for further details.

## Contributing

The questions regarding the structure of the catalog can benefit from community input.  Please add your ideas to one of the issues below.

1. [What should the basic shape of a catalog entrty look like?](./issues/1)
2. [How should we handle links from an asset to its online access point(s)?](./issues/2)
3. [How should we handle links between assets (e.g. software dependencies)?](./issues/3)
4. [What SKOS concepts should we use to structure the catalog?](./issues/4)

In addition to contributing to the issues and eventually to the catalog data itself, everyone is invited to share their ideas in the [Solid Practitioners matrix chat](https://matrix.to/#/#solid-practitioners:matrix.org).  Occassional meetings regarding the catalog will be announced there. Ping me (@jeff-zucker) or @elf-pavlik if you have questions.

This repo is for the asset data, the SKOS concepts, and the SHACL shape of the catalog.  For contributions to apps using these resources, see [Solid Catalog](https://github.com/solid-contrib/catalog) and [Solid Efforts](https://github.com/elf-pavlik/solid-efforts).
