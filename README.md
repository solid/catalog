# Solid Resources Catalog

-- a listing of things useful to the Solid Community

## Overview

The purpose of this project is to create and make public a comprehensive listing of people, organizations, products, services, and events useful to people wanting to learn about, use, create, or promote the Solid software ecosystyem.  Data will be kept in RDF as described in this repo and can therefore be reused by multiple applications.  Three initial applications are in progress. [Solid Catalog](https://github.com/solid-contrib/catalog) is an app to display a searchable version of the catalog on the Solid Project website and pod. [Solid Efforts](https://github.com/elf-pavlik/solid-efforts) is an app intended to support exploration of the interal links between the Solid Specifications and other parts of the Solid ecosystem; [Solid Catalog Viewer](https://solid-catalog.jeswr.org/) is an alternate viewer for the data. 

**Checkout the (very preliminary) [online version of the catalog](https://solidproject.solidcommunity.net/catalog/)!**

**Note** This is a work in progress, please do not take any of the data presented as representative of the people, organizations, and software listed - the data has not been vetted.  We are creating forms and will make a call for editing and adding once the forms are ready.

## Long Term Goals

While the catalog will start as a single hard-coded RDF document, the goal is to eventually support aggregation of data from other sources.  Personal, organizational, and software client WebID profiles contain data relevant to the catalog.  We can encourage all resources to create ClientID or WebID profiles, or a "README.ttl" - its own catalog entry describing itself which can be imported to aggregating catalogs.

The task of cataloging resources is shared by most organizations so a long term goal of this project is to create reusable shapes which can be formalized into client-to-client specifications and to document the process of creating the catalog and using the shapes so that other organizations don't have to reinvent the wheel.

## Scope

In order to limit the work of updating the catalog, records are designed to cover only the basics - what type of thing is it? what is it useful for? what is its name and brief description? who made it? what other things is it related to? how can I find out more?  The catalog record is not like a full WebID or ClientID profile - it covers the basics and points to those types of documents for further details.

## Repository structure & versioning

This repo is for the asset data, the SKOS concepts, and the SHACL shape of the catalog.  For contributions to apps using these resources, see [Solid Catalog](https://github.com/solid-contrib/catalog) and [Solid Efforts](https://github.com/elf-pavlik/solid-efforts).

The repo will be versioned e.g. v1, v2, etc. This will support apps continuing to function with an older version while transitioning to a newer version.

## Contributing

The questions regarding the structure of the catalog can benefit from community input.  Please add your ideas to one of the issues below.

1. [What should the basic shape of a catalog entrty look like?](https://github.com/solid/catalog/issues/1)
2. [How should we handle links from an asset to its online access point(s)?](https://github.com/solid/catalog/issues/2)
3. [How should we handle links between assets (e.g. software dependencies)?](https://github.com/solid/catalog/issues/3)
4. [What SKOS concepts should we use to structure the catalog?](https://github.com/solid/catalog/issues/4)

In addition to contributing to the issues and eventually to the catalog data itself, everyone is invited to share their ideas in the [Solid Practitioners matrix chat](https://matrix.to/#/#solid-practitioners:matrix.org).  Occassional meetings regarding the catalog will be announced there. Ping me (@jeff-zucker) or @elf-pavlik if you have questions.

## Acknowledgements

The catalog was started by and is currently maintained by Jeff Zucker.  Jesse Wright and Elf Pavlik worked on the viewers mentioned above. The two of them and Daniel Bakas have contributed to the ongoing work defining shapes.  Timea Turdeen, Mathias Evering, and Denis Sirlov gathered some of the data which forms the basis for the catalog.  Thanks to all for their contributions.

