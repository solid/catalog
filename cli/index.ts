#!/usr/bin/env -S node --disable-warning=ExperimentalWarning

import { Command } from 'commander'
import { getPath } from './util.ts'
import { formatData } from './format.ts'

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
  })

program.parse()
