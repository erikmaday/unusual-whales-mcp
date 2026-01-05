#!/usr/bin/env node

/**
 * API Sync Checker
 *
 * Fetches the latest UnusualWhales OpenAPI spec and compares it against
 * the implemented endpoints in this MCP server.
 *
 * When run in GitHub Actions with GITHUB_TOKEN, creates an issue if there are changes.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

const OPENAPI_URL = 'https://api.unusualwhales.com/api/openapi'

// Endpoints we intentionally don't implement (WebSocket, etc.)
const IGNORED_ENDPOINTS = [
  '/api/socket',
  '/api/socket/flow_alerts',
  '/api/socket/gex',
  '/api/socket/news',
  '/api/socket/option_trades',
  '/api/socket/price',
]

async function fetchOpenAPISpec() {
  console.log('Fetching OpenAPI spec from UnusualWhales...')
  const response = await fetch(OPENAPI_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`)
  }
  const text = await response.text()
  return YAML.parse(text)
}

function extractSpecEndpoints(spec) {
  const paths = spec.paths || {}
  return Object.keys(paths)
    .filter(path => path.startsWith('/api/'))
    .filter(path => !IGNORED_ENDPOINTS.some(ignored => path.startsWith(ignored)))
    .sort()
}

function extractImplementedEndpoints() {
  const toolsDir = join(ROOT_DIR, 'src', 'tools')
  const files = readdirSync(toolsDir).filter(f => f.endsWith('.ts'))

  const endpoints = new Set()

  for (const file of files) {
    const content = readFileSync(join(toolsDir, file), 'utf-8')

    // Match API endpoint patterns in uwFetch calls
    const patterns = [
      /uwFetch\(`([^`]+)`/g,
      /uwFetch\("([^"]+)"/g,
      /uwFetch\('([^']+)'/g,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        let endpoint = match[1]
        // Normalize: replace ${encodePath(variable)} with {variable}
        endpoint = endpoint.replace(/\$\{encodePath\((\w+)\)\}/g, '{$1}')
        // Normalize: replace ${encodeURIComponent(variable as string)} with {variable}
        endpoint = endpoint.replace(/\$\{encodeURIComponent\((\w+)\s+as\s+string\)\}/g, '{$1}')
        // Normalize: replace ${variable} with {variable}
        endpoint = endpoint.replace(/\$\{(\w+)\}/g, '{$1}')
        // Normalize: replace {safeVariable} with {variable} (strip 'safe' prefix)
        endpoint = endpoint.replace(/\{safeCandle\}/g, '{candle_size}')
        endpoint = endpoint.replace(/\{safe(\w+)\}/g, (_, name) => `{${name.toLowerCase()}}`)
        // Only include /api/ endpoints
        if (endpoint.startsWith('/api/')) {
          endpoints.add(endpoint)
        }
      }
    }
  }

  return Array.from(endpoints).sort()
}

function normalizeEndpoint(endpoint) {
  // Replace specific path params with generic placeholders for comparison
  return endpoint
    .replace(/\{ticker\}/g, '{param}')
    .replace(/\{id\}/g, '{param}')
    .replace(/\{name\}/g, '{param}')
    .replace(/\{sector\}/g, '{param}')
    .replace(/\{date\}/g, '{param}')
    .replace(/\{expiry\}/g, '{param}')
    .replace(/\{month\}/g, '{param}')
    .replace(/\{candle_size\}/g, '{param}')
    .replace(/\{flow_group\}/g, '{param}')
    .replace(/\{politician_id\}/g, '{param}')
}

function compareEndpoints(specEndpoints, implementedEndpoints) {
  const normalizedSpec = new Map()
  for (const ep of specEndpoints) {
    normalizedSpec.set(normalizeEndpoint(ep), ep)
  }

  const normalizedImpl = new Map()
  for (const ep of implementedEndpoints) {
    normalizedImpl.set(normalizeEndpoint(ep), ep)
  }

  const missing = []
  const extra = []

  for (const [normalized, original] of normalizedSpec) {
    if (!normalizedImpl.has(normalized)) {
      missing.push(original)
    }
  }

  for (const [normalized, original] of normalizedImpl) {
    if (!normalizedSpec.has(normalized)) {
      extra.push(original)
    }
  }

  return { missing, extra }
}

function getEndpointCategory(endpoint) {
  // Extract category from endpoint path like /api/congress/... -> congress
  const match = endpoint.match(/^\/api\/([^/]+)/)
  return match ? match[1] : 'unknown'
}

function formatEndpointName(endpoint) {
  // Convert /api/politician-portfolios/disclosures -> "politician portfolios disclosures"
  return endpoint
    .replace(/^\/api\//, '')
    .replace(/[/-]/g, ' ')
    .replace(/\{[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function createGitHubIssue(missing, extra) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!token || !repo) {
    console.log('\nGitHub credentials not found. Run in GitHub Actions to auto-create issues.')
    return false
  }

  const issues = []

  // Create an issue for each missing endpoint
  for (const endpoint of missing) {
    const category = getEndpointCategory(endpoint)
    const name = formatEndpointName(endpoint)

    const title = `Implement new endpoint: ${endpoint}`

    let body = `## New API Endpoint Detected\n\n`
    body += `The Unusual Whales API has a new endpoint that needs to be implemented in this MCP server.\n\n`
    body += `### Endpoint\n\n`
    body += `\`${endpoint}\`\n\n`
    body += `### Category\n\n`
    body += `\`${category}\`\n\n`
    body += `### Action Required\n\n`
    body += `1. Check the [Unusual Whales API documentation](https://docs.unusualwhales.com) for endpoint details\n`
    body += `2. Add the endpoint to the appropriate tool file in \`src/tools/\`\n`
    body += `3. Update tests if applicable\n\n`
    body += `---\n*This issue was automatically created by the API sync checker.*`

    issues.push({ title, body, labels: ['api-sync', 'new-endpoint', category] })
  }

  // Create an issue for each extra/removed endpoint
  for (const endpoint of extra) {
    const category = getEndpointCategory(endpoint)

    const title = `Review removed endpoint: ${endpoint}`

    let body = `## Endpoint May Have Been Removed\n\n`
    body += `This endpoint is implemented in the MCP server but was not found in the current Unusual Whales API spec.\n\n`
    body += `### Endpoint\n\n`
    body += `\`${endpoint}\`\n\n`
    body += `### Category\n\n`
    body += `\`${category}\`\n\n`
    body += `### Action Required\n\n`
    body += `1. Verify if this endpoint has been removed or renamed in the API\n`
    body += `2. If removed, deprecate or remove the endpoint from the MCP server\n`
    body += `3. If renamed, update the implementation to use the new endpoint path\n\n`
    body += `---\n*This issue was automatically created by the API sync checker.*`

    issues.push({ title, body, labels: ['api-sync', 'removed-endpoint', category] })
  }

  // Create all issues
  let created = 0
  for (const issue of issues) {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issue),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Failed to create GitHub issue "${issue.title}":`, error)
    } else {
      const result = await response.json()
      console.log(`Created issue: ${result.html_url}`)
      created++
    }
  }

  console.log(`\nCreated ${created}/${issues.length} GitHub issues`)
  return created > 0
}

async function main() {
  try {
    const spec = await fetchOpenAPISpec()
    const specEndpoints = extractSpecEndpoints(spec)
    console.log(`Found ${specEndpoints.length} endpoints in API spec`)

    const implementedEndpoints = extractImplementedEndpoints()
    console.log(`Found ${implementedEndpoints.length} implemented endpoints`)

    const { missing, extra } = compareEndpoints(specEndpoints, implementedEndpoints)

    if (missing.length === 0 && extra.length === 0) {
      console.log('\n✅ API is in sync! No changes detected.')
      process.exit(0)
    }

    console.log('\n⚠️  API changes detected:\n')

    if (missing.length > 0) {
      console.log(`Missing endpoints (${missing.length}):`)
      missing.forEach(ep => console.log(`  - ${ep}`))
    }

    if (extra.length > 0) {
      console.log(`\nExtra endpoints (${extra.length}):`)
      extra.forEach(ep => console.log(`  - ${ep}`))
    }

    // Create GitHub issue if running in CI
    if (process.env.GITHUB_ACTIONS) {
      await createGitHubIssue(missing, extra)
    }

    // Exit with error code to fail the CI check
    process.exit(1)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
