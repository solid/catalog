#!/usr/bin/env -S node --disable-warning=ExperimentalWarning

import { Command } from 'commander'
import { getPath, loadData, saveData } from './util.ts'
import { validateWebid } from './validations/webid.ts'
import { migrateWebid } from './migrations/webid.ts'
import { aggregateW3C } from './aggregations/w3c.ts'
import { aggregateGithub } from './aggregations/github.ts'
import { aggregateWikidata } from './aggregations/wikidata.ts'

const dataPath = getPath(import.meta.url, '../catalog-data.ttl')
const dataset = await loadData(dataPath)

const program = new Command()

program
  .name('solid-catalog')
  .description('CLI to manage Solid Catalog')
  .version('0.1.0')

program.command('format')
  .description('Formats catalog data in a deterministic way')
  .action(async () => {
    console.info('Formatting data')
    await saveData(dataset, dataPath)
  })

const validate = program.command('validate')
validate.command('webid')
  .description('Checks statements with ex:webid that subject and object are the same')
  .action(async () => {
    console.info('Validate ex:webid statements')
    await validateWebid(dataset)
  })

const migrate = program.command('migrate')
migrate.command('webid')
  .description('Picks object in statement with ex:webid and makes it a subject, then updates all other statements using the old subject')
  .action(async () => {
    console.info('migrate ex:webid statements and related data')
    const updated = await migrateWebid(dataset)
    await saveData(updated, dataPath)
  })

const aggregate = program.command('aggregate')
aggregate.command('w3c')
  .description('Adds data from W3C API')
  .action(async () => {
    console.info('Fetching data from W3C API')
    const updated = await aggregateW3C(dataset)
    await saveData(updated, dataPath)
  })

aggregate.command('github')
  .description('Adds data from Github API')
  .action(async () => {
    console.info('Fetching data from Github API')
    const updated = await aggregateGithub(dataset)
    await saveData(updated, dataPath)
  })

aggregate.command('wikidata')
  .description('Adds data from Wikidata')
  .action(async () => {
    console.info('Fetching data Wikiadta')
    const updated = await aggregateWikidata(dataset)
    await saveData(updated, dataPath)
  })

program.parse(process.argv)
