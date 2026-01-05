#!/usr/bin/env node

/**
 * Fetch and save the UnusualWhales OpenAPI spec.
 *
 * Downloads the latest spec and saves it to uw-api-spec.yaml.
 * This should be run before check-api-sync.js to update the local spec.
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const SPEC_FILE = join(ROOT_DIR, 'uw-api-spec.yaml')

const OPENAPI_URL = 'https://api.unusualwhales.com/api/openapi'

async function main() {
  console.log('Fetching OpenAPI spec from UnusualWhales...')

  const response = await fetch(OPENAPI_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`)
  }

  const text = await response.text()
  writeFileSync(SPEC_FILE, text)

  console.log(`Saved OpenAPI spec to uw-api-spec.yaml`)
}

main().catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
})
