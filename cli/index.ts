#!/usr/bin/env -S node --disable-warning=ExperimentalWarning

import { Command } from 'commander'
import { getPath } from './util.ts'
import { formatData } from './format.ts'
import { validateWebid } from './validations/webid.ts'
import { migrateWebid } from './migrations/webid.ts'

const dataPath = getPath(import.meta.url, '../catalog-data.ttl')

const program = new Command()

program
  .name('solid-catalog')
  .description('CLI to manage Solid Catalog')
  .version('0.1.0')

program.command('format')
  .description('Formats catalog data in a deterministic way')
  .action(async () => {
    console.info('Formatting data')
    await formatData(dataPath)
  })// Add nested commands using `.command()`.

const validate = program.command('validate')
validate.command('webid')
  .description('Checks statements with ex:webid that subject and object are the same')
  .action(async () => {
    console.info('Validate ex:webid statements')
    await validateWebid(dataPath)
  })

const migrate = program.command('migrate')
migrate.command('webid')
  .description('Picks object in statement with ex:webid and makes it a subject, then updates all other statements using the old subject')
  .action(async () => {
    console.info('migrate ex:webid statements and related data')
    await migrateWebid(dataPath)
  })

program.parse(process.argv)
