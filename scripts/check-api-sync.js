#!/usr/bin/env node

/**
 * API Sync Checker
 *
 * Compares the UnusualWhales OpenAPI spec against the implemented endpoints
 * in this MCP server, checking both endpoint coverage AND parameter coverage.
 *
 * Checks:
 * 1. Missing endpoints (in spec but not implemented)
 * 2. Extra endpoints (implemented but not in spec)
 * 3. Missing required parameters (will cause API errors)
 * 4. Missing optional parameters (reduced functionality)
 * 5. Extra parameters (implemented but not in spec - may be removed/renamed)
 *
 * When run in GitHub Actions with GITHUB_TOKEN, creates issues for problems.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const SPEC_FILE = join(ROOT_DIR, 'uw-api-spec.yaml')

// Endpoints we intentionally don't implement (WebSocket, etc.)
const IGNORED_ENDPOINTS = [
  '/api/socket',
  '/api/socket/flow_alerts',
  '/api/socket/gex',
  '/api/socket/news',
  '/api/socket/option_trades',
  '/api/socket/price',
]

function loadOpenAPISpec() {
  console.log('Loading OpenAPI spec from uw-api-spec.yaml...')
  const text = readFileSync(SPEC_FILE, 'utf-8')
  return YAML.parse(text)
}

/**
 * Extract all endpoints and their parameters from the OpenAPI spec
 */
function extractSpecEndpointsWithParams(spec) {
  const paths = spec.paths || {}
  const endpoints = {}

  for (const [path, methods] of Object.entries(paths)) {
    if (!path.startsWith('/api/')) continue
    if (IGNORED_ENDPOINTS.some(ignored => path.startsWith(ignored))) continue

    // We only care about GET methods for this API
    const getMethod = methods.get
    if (!getMethod) continue

    const params = {
      required: [],
      optional: [],
      path: [],
      operationId: getMethod.operationId || null,
    }

    for (const param of getMethod.parameters || []) {
      const paramName = param.name
      const isRequired = param.required === true

      if (param.in === 'path') {
        params.path.push(paramName)
      } else if (param.in === 'query') {
        if (isRequired) {
          params.required.push(paramName)
        } else {
          params.optional.push(paramName)
        }
      }
    }

    endpoints[path] = params
  }

  return endpoints
}

/**
 * Extract implemented endpoints and the parameters passed to uwFetch
 */
function extractImplementedEndpointsWithParams() {
  const toolsDir = join(ROOT_DIR, 'src', 'tools')
  const files = readdirSync(toolsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts')

  const endpoints = {}

  for (const file of files) {
    const content = readFileSync(join(toolsDir, file), 'utf-8')

    // Match uwFetch calls with their parameters
    // Pattern: uwFetch(`/api/...` or uwFetch("/api/..." or uwFetch('/api/...'
    // Followed by optional , { param1, param2, ... } or , { "param1": value, ... }
    const uwFetchPattern = /uwFetch\(\s*([`"'])([^`"']+)\1(?:\s*,\s*\{([^}]*)\})?\s*\)/g

    let match
    while ((match = uwFetchPattern.exec(content)) !== null) {
      let endpoint = match[2]
      const paramsBlock = match[3] || ''

      // Normalize endpoint path
      endpoint = normalizeEndpointPath(endpoint)

      if (!endpoint.startsWith('/api/')) continue

      // Extract parameter names from the params block
      const passedParams = extractParamsFromBlock(paramsBlock)

      if (!endpoints[endpoint]) {
        endpoints[endpoint] = {
          file,
          params: new Set(),
        }
      }

      // Merge params from multiple calls to same endpoint
      for (const p of passedParams) {
        endpoints[endpoint].params.add(p)
      }
    }
  }

  // Convert Sets to arrays
  for (const ep of Object.keys(endpoints)) {
    endpoints[ep].params = Array.from(endpoints[ep].params)
  }

  return endpoints
}

/**
 * Normalize an endpoint path from code to match spec format
 */
function normalizeEndpointPath(endpoint) {
  return endpoint
    // Replace ${encodePath(variable)} with {variable}
    .replace(/\$\{encodePath\((\w+)\)\}/g, '{$1}')
    // Replace ${encodeURIComponent(variable as string)} with {variable}
    .replace(/\$\{encodeURIComponent\((\w+)\s+as\s+string\)\}/g, '{$1}')
    // Replace ${variable} with {variable}
    .replace(/\$\{(\w+)\}/g, '{$1}')
    // Replace {safeCandle} with {candle_size}
    .replace(/\{safeCandle\}/g, '{candle_size}')
    // Replace {safeVariable} with {variable}
    .replace(/\{safe(\w+)\}/g, (_, name) => `{${name.toLowerCase()}}`)
}

/**
 * Extract parameter names from a uwFetch params block
 */
function extractParamsFromBlock(block) {
  if (!block.trim()) return []

  const params = []

  // Match patterns like: param, param: value, "param": value, 'param': value
  // Also handle "param[]": value for array params
  const patterns = [
    /["']([^"']+)["']\s*:/g,  // "param": or 'param':
    /(\w+)\s*:/g,              // param:
    /(\w+)\s*,/g,              // param, (shorthand)
    /(\w+)\s*$/g,              // param at end (shorthand)
  ]

  // Simple shorthand: { param1, param2 }
  const shorthandMatch = block.match(/^\s*[\w\s,]+\s*$/)
  if (shorthandMatch) {
    const names = block.split(',').map(s => s.trim()).filter(Boolean)
    return names
  }

  // Object with key-value pairs
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(block)) !== null) {
      let paramName = match[1]
      // Remove [] suffix for array params
      paramName = paramName.replace(/\[\]$/, '')
      if (paramName && !params.includes(paramName)) {
        params.push(paramName)
      }
    }
  }

  return params
}

/**
 * Normalize endpoint for comparison (replace specific path params with generic)
 */
function normalizeForComparison(endpoint) {
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

/**
 * Find the spec endpoint that matches an implemented endpoint
 */
function findMatchingSpecEndpoint(implEndpoint, specEndpoints) {
  const normalizedImpl = normalizeForComparison(implEndpoint)

  for (const specEndpoint of Object.keys(specEndpoints)) {
    if (normalizeForComparison(specEndpoint) === normalizedImpl) {
      return specEndpoint
    }
  }

  return null
}

/**
 * Compare endpoints and parameters
 */
function compareAll(specEndpoints, implEndpoints) {
  const results = {
    missingEndpoints: [],
    extraEndpoints: [],
    missingRequiredParams: [],
    missingOptionalParams: [],
    extraParams: [],
    summary: {
      totalSpecEndpoints: Object.keys(specEndpoints).length,
      totalImplEndpoints: Object.keys(implEndpoints).length,
      endpointsCovered: 0,
      requiredParamsMissing: 0,
      optionalParamsMissing: 0,
      extraParams: 0,
    },
  }

  const normalizedSpecMap = new Map()
  for (const ep of Object.keys(specEndpoints)) {
    normalizedSpecMap.set(normalizeForComparison(ep), ep)
  }

  const normalizedImplMap = new Map()
  for (const ep of Object.keys(implEndpoints)) {
    normalizedImplMap.set(normalizeForComparison(ep), ep)
  }

  // Find missing endpoints (in spec but not implemented)
  for (const [normalized, specEp] of normalizedSpecMap) {
    if (!normalizedImplMap.has(normalized)) {
      results.missingEndpoints.push({
        endpoint: specEp,
        operationId: specEndpoints[specEp].operationId,
      })
    }
  }

  // Find extra endpoints (implemented but not in spec)
  for (const [normalized, implEp] of normalizedImplMap) {
    if (!normalizedSpecMap.has(normalized)) {
      results.extraEndpoints.push(implEp)
    }
  }

  // Check parameter coverage for implemented endpoints
  for (const [implEndpoint, implData] of Object.entries(implEndpoints)) {
    const specEndpoint = findMatchingSpecEndpoint(implEndpoint, specEndpoints)

    if (!specEndpoint) continue // Extra endpoint, already reported

    results.summary.endpointsCovered++

    const specParams = specEndpoints[specEndpoint]
    const passedParams = implData.params

    // Check required params
    for (const reqParam of specParams.required) {
      if (!passedParams.includes(reqParam) && !passedParams.includes(reqParam.replace('[]', ''))) {
        results.missingRequiredParams.push({
          endpoint: specEndpoint,
          param: reqParam,
          file: implData.file,
          operationId: specParams.operationId,
        })
        results.summary.requiredParamsMissing++
      }
    }

    // Check optional params
    for (const optParam of specParams.optional) {
      const paramName = optParam.replace('[]', '')
      if (!passedParams.includes(paramName) && !passedParams.includes(optParam)) {
        results.missingOptionalParams.push({
          endpoint: specEndpoint,
          param: optParam,
          file: implData.file,
          operationId: specParams.operationId,
        })
        results.summary.optionalParamsMissing++
      }
    }

    // Check for extra params (implemented but not in spec)
    const allSpecParams = [
      ...specParams.required,
      ...specParams.optional,
      ...specParams.path,
    ].map(p => p.replace('[]', ''))

    for (const passedParam of passedParams) {
      const paramName = passedParam.replace('[]', '')
      if (!allSpecParams.includes(paramName)) {
        results.extraParams.push({
          endpoint: specEndpoint,
          param: passedParam,
          file: implData.file,
          operationId: specParams.operationId,
        })
        results.summary.extraParams++
      }
    }
  }

  return results
}

function getEndpointCategory(endpoint) {
  const match = endpoint.match(/^\/api\/([^/]+)/)
  return match ? match[1] : 'unknown'
}

/**
 * Build a documentation link for an endpoint
 */
function buildDocLink(operationId) {
  if (!operationId) return null
  return `https://api.unusualwhales.com/docs#/operations/${operationId}`
}

/**
 * Print results to console
 */
function printResults(results) {
  const { missingEndpoints, extraEndpoints, missingRequiredParams, missingOptionalParams, extraParams, summary } = results

  console.log('\n' + '='.repeat(60))
  console.log('API SYNC CHECK RESULTS')
  console.log('='.repeat(60))

  console.log(`\nEndpoint Coverage: ${summary.endpointsCovered}/${summary.totalSpecEndpoints} spec endpoints implemented`)

  // Missing endpoints
  if (missingEndpoints.length > 0) {
    console.log(`\n❌ Missing Endpoints (${missingEndpoints.length}):`)
    for (const { endpoint, operationId } of missingEndpoints) {
      const docLink = buildDocLink(operationId)
      console.log(`   - ${endpoint}${docLink ? ` (${docLink})` : ''}`)
    }
  } else {
    console.log('\n✅ All spec endpoints are implemented')
  }

  // Extra endpoints
  if (extraEndpoints.length > 0) {
    console.log(`\n⚠️  Extra Endpoints (${extraEndpoints.length}) - not in spec:`)
    for (const ep of extraEndpoints) {
      console.log(`   - ${ep}`)
    }
  }

  // Missing required params (CRITICAL)
  if (missingRequiredParams.length > 0) {
    console.log(`\n🔴 CRITICAL: Missing REQUIRED Parameters (${missingRequiredParams.length}):`)
    const byEndpoint = groupBy(missingRequiredParams, 'endpoint')
    for (const [endpoint, params] of Object.entries(byEndpoint)) {
      console.log(`   ${endpoint}`)
      for (const p of params) {
        console.log(`      - ${p.param} (${p.file})`)
      }
    }
  } else {
    console.log('\n✅ All required parameters are implemented')
  }

  // Missing optional params
  if (missingOptionalParams.length > 0) {
    console.log(`\n🟡 Missing Optional Parameters (${missingOptionalParams.length}):`)
    const byFile = groupBy(missingOptionalParams, 'file')
    for (const [file, params] of Object.entries(byFile)) {
      console.log(`\n   ${file}:`)
      const byEndpoint = groupBy(params, 'endpoint')
      for (const [endpoint, eps] of Object.entries(byEndpoint)) {
        const paramNames = eps.map(e => e.param).join(', ')
        console.log(`      ${endpoint}`)
        console.log(`         Missing: ${paramNames}`)
      }
    }
  } else {
    console.log('\n✅ All optional parameters are implemented')
  }

  // Extra params (implemented but not in spec)
  if (extraParams.length > 0) {
    console.log(`\n⚠️  Extra Parameters (${extraParams.length}) - not in spec:`)
    const byFile = groupBy(extraParams, 'file')
    for (const [file, params] of Object.entries(byFile)) {
      console.log(`\n   ${file}:`)
      const byEndpoint = groupBy(params, 'endpoint')
      for (const [endpoint, eps] of Object.entries(byEndpoint)) {
        const paramNames = eps.map(e => e.param).join(', ')
        console.log(`      ${endpoint}`)
        console.log(`         Extra: ${paramNames}`)
      }
    }
  } else {
    console.log('\n✅ No extra parameters found')
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Endpoints in spec:      ${summary.totalSpecEndpoints}`)
  console.log(`Endpoints implemented:  ${summary.endpointsCovered}`)
  console.log(`Missing endpoints:      ${missingEndpoints.length}`)
  console.log(`Extra endpoints:        ${extraEndpoints.length}`)
  console.log(`Missing required params: ${summary.requiredParamsMissing}`)
  console.log(`Missing optional params: ${summary.optionalParamsMissing}`)
  console.log(`Extra params:           ${summary.extraParams}`)

  const hasIssues = missingEndpoints.length > 0 ||
    missingRequiredParams.length > 0 ||
    missingOptionalParams.length > 0 ||
    extraParams.length > 0

  if (!hasIssues) {
    console.log('\n✅ API is fully in sync!')
  } else {
    console.log('\n⚠️  Issues detected - see above for details')
  }

  return hasIssues
}

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {})
}

/**
 * Generate a unique identifier for an issue (used for idempotency)
 */
function generateIssueId(type, ...parts) {
  return `<!-- api-sync-id: ${type}:${parts.join(':')} -->`
}

/**
 * Extract issue ID from issue body
 */
function extractIssueId(body) {
  const match = body?.match(/<!-- api-sync-id: ([^ ]+) -->/)
  return match ? match[1] : null
}

/**
 * Extract the content portion of a body (without ID/update markers)
 */
function extractBodyContent(body) {
  if (!body) return ''
  return body
    // Remove the ID comment
    .replace(/<!--\s*api-sync-id:[^>]+-->\s*/, '')
    // Remove the update marker and header from comments
    .replace(/<!--\s*api-sync-update\s*-->\s*/, '')
    .replace(/## Updated Details\s*\n+The API sync checker detected changes:\s*\n+/, '')
    .trim()
}

/**
 * Check if a comment was auto-generated by this script
 */
function isAutoGeneratedComment(comment) {
  return comment.body?.includes('<!-- api-sync-update -->')
}

/**
 * Fetch comments for an issue
 */
async function fetchIssueComments(token, repo, issueNumber) {
  const comments = []
  let page = 1
  const perPage = 100

  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      console.error(`Failed to fetch comments for issue #${issueNumber}:`, await response.text())
      return comments
    }

    const data = await response.json()
    if (data.length === 0) break

    comments.push(...data)
    if (data.length < perPage) break
    page++
  }

  return comments
}

/**
 * Post a comment to an issue
 */
async function postIssueComment(token, repo, issueNumber, body) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to post comment: ${error}`)
  }

  return response.json()
}

/**
 * Fetch existing open issues with api-sync label
 */
async function fetchExistingIssues(token, repo) {
  const issues = []
  let page = 1
  const perPage = 100

  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&labels=api-sync&per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch existing issues:', await response.text())
      return issues
    }

    const data = await response.json()
    if (data.length === 0) break

    issues.push(...data)
    if (data.length < perPage) break
    page++
  }

  return issues
}

/**
 * Create GitHub issues for problems found
 */
async function createGitHubIssues(results) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!token || !repo) {
    console.log('\nGitHub credentials not found. Set GITHUB_TOKEN and GITHUB_REPOSITORY to create issues.')
    return
  }

  // Fetch existing open issues to avoid duplicates
  console.log('\nFetching existing open issues...')
  const existingIssues = await fetchExistingIssues(token, repo)
  // Map issue ID -> issue object for quick lookup
  const existingById = new Map()
  for (const issue of existingIssues) {
    const id = extractIssueId(issue.body)
    if (id) {
      existingById.set(id, issue)
    }
  }
  console.log(`Found ${existingIssues.length} existing open api-sync issues (${existingById.size} with valid IDs)`)

  const issues = []

  // Create issues for missing endpoints (one per endpoint)
  for (const { endpoint, operationId } of results.missingEndpoints) {
    const category = getEndpointCategory(endpoint)
    const docLink = buildDocLink(operationId)
    const issueId = generateIssueId('missing-endpoint', endpoint)
    issues.push({
      id: issueId,
      title: `Implement new endpoint: ${endpoint}`,
      body: `${issueId}\n\n## New API Endpoint Detected\n\n` +
        `The Unusual Whales API has a new endpoint that needs to be implemented.\n\n` +
        `### Endpoint\n\n\`${endpoint}\`\n\n` +
        `### Category\n\n\`${category}\`\n\n` +
        (docLink ? `### Documentation\n\n[View API Docs](${docLink})\n\n` : '') +
        `---\n*Auto-generated by API sync checker*`,
      labels: ['api-sync', 'new-endpoint', category],
    })
  }

  // Create an issue for EACH missing required param (critical)
  for (const { endpoint, param, file, operationId } of results.missingRequiredParams) {
    const category = getEndpointCategory(endpoint)
    const docLink = buildDocLink(operationId)
    const issueId = generateIssueId('missing-required-param', endpoint, param)
    issues.push({
      id: issueId,
      title: `Missing required parameter: ${param} for ${endpoint}`,
      body: `${issueId}\n\n## Missing Required Parameter\n\n` +
        `A required API parameter is not being passed, which may cause API errors.\n\n` +
        `### Details\n\n` +
        `- **Endpoint:** \`${endpoint}\`\n` +
        `- **Parameter:** \`${param}\`\n` +
        `- **File:** \`src/tools/${file}\`\n` +
        (docLink ? `- **API Docs:** [View Documentation](${docLink})\n` : '') +
        `\n### Action Required\n\n` +
        `1. Add the \`${param}\` parameter to the tool's input schema\n` +
        `2. Pass the parameter to the \`uwFetch\` call\n` +
        `3. Update the tool description if needed\n\n` +
        `---\n*Auto-generated by API sync checker*`,
      labels: ['api-sync', 'critical', 'missing-parameter', category],
    })
  }

  // Create ONE issue per tool for missing optional params
  const optionalByFile = groupBy(results.missingOptionalParams, 'file')
  for (const [file, params] of Object.entries(optionalByFile)) {
    const byEndpoint = groupBy(params, 'endpoint')
    const paramCount = params.length
    const issueId = generateIssueId('missing-optional-params', file)

    let body = `${issueId}\n\n## Missing Optional Parameters\n\n` +
      `The following optional API parameters are not being passed in \`src/tools/${file}\`.\n` +
      `Adding these would improve filtering and functionality.\n\n`

    for (const [endpoint, eps] of Object.entries(byEndpoint)) {
      const docLink = buildDocLink(eps[0]?.operationId)
      body += `### \`${endpoint}\`\n\n`
      if (docLink) {
        body += `[View API Docs](${docLink})\n\n`
      }
      for (const p of eps) {
        body += `- \`${p.param}\`\n`
      }
      body += '\n'
    }

    body += `---\n*Auto-generated by API sync checker*`

    const toolName = file.replace('.ts', '')
    issues.push({
      id: issueId,
      title: `Add ${paramCount} missing optional parameters to ${toolName} tool`,
      body,
      labels: ['api-sync', 'enhancement', 'missing-parameter', toolName],
    })
  }

  // Create ONE issue per tool for extra params (not in spec)
  const extraByFile = groupBy(results.extraParams, 'file')
  for (const [file, params] of Object.entries(extraByFile)) {
    const byEndpoint = groupBy(params, 'endpoint')
    const paramCount = params.length
    const issueId = generateIssueId('extra-params', file)

    let body = `${issueId}\n\n## Extra Parameters Not In API Spec\n\n` +
      `The following parameters are being passed in \`src/tools/${file}\` but are not documented in the API spec.\n` +
      `These parameters may have been removed from the API or may be incorrectly named.\n\n`

    for (const [endpoint, eps] of Object.entries(byEndpoint)) {
      const docLink = buildDocLink(eps[0]?.operationId)
      body += `### \`${endpoint}\`\n\n`
      if (docLink) {
        body += `[View API Docs](${docLink})\n\n`
      }
      for (const p of eps) {
        body += `- \`${p.param}\`\n`
      }
      body += '\n'
    }

    body += `### Action Required\n\n` +
      `1. Verify if these parameters are still supported by the API\n` +
      `2. If removed, remove them from the tool's input schema and uwFetch call\n` +
      `3. If renamed, update to the new parameter name\n\n` +
      `---\n*Auto-generated by API sync checker*`

    const toolName = file.replace('.ts', '')
    issues.push({
      id: issueId,
      title: `Remove ${paramCount} extra parameters from ${toolName} tool`,
      body,
      labels: ['api-sync', 'cleanup', 'extra-parameter', toolName],
    })
  }

  // Create issues or update existing ones
  let created = 0
  let updated = 0
  let skipped = 0

  for (const issue of issues) {
    // Extract the issue ID value
    const idMatch = issue.id?.match(/<!-- api-sync-id: ([^ ]+) -->/)
    const issueIdValue = idMatch ? idMatch[1] : null

    // Check if issue with same ID already exists
    const existingIssue = issueIdValue ? existingById.get(issueIdValue) : null

    if (existingIssue) {
      // Issue exists - check if content has changed
      try {
        const newContent = extractBodyContent(issue.body)
        const existingContent = extractBodyContent(existingIssue.body)

        // Fetch comments to check for auto-generated updates
        const comments = await fetchIssueComments(token, repo, existingIssue.number)
        const autoComments = comments.filter(isAutoGeneratedComment)
        const latestAutoComment = autoComments[autoComments.length - 1]

        // Compare against latest auto-comment if exists, otherwise against issue body
        const contentToCompare = latestAutoComment
          ? extractBodyContent(latestAutoComment.body)
          : existingContent

        if (newContent !== contentToCompare) {
          // Content has changed - post update comment
          const updateBody = `<!-- api-sync-update -->\n\n` +
            `## Updated Details\n\n` +
            `The API sync checker detected changes:\n\n` +
            `${newContent}`

          await postIssueComment(token, repo, existingIssue.number, updateBody)
          console.log(`Updated issue #${existingIssue.number}: ${existingIssue.html_url}`)
          updated++
        } else {
          skipped++
        }
      } catch (err) {
        console.error(`Error updating issue #${existingIssue.number}:`, err.message)
      }
      continue
    }

    // No existing issue - create new one
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`Created issue: ${result.html_url}`)
        created++
      } else {
        const error = await response.text()
        console.error(`Failed to create issue "${issue.title}":`, error)
      }
    } catch (err) {
      console.error(`Error creating issue:`, err.message)
    }
  }

  console.log(`\nGitHub issues: ${created} created, ${updated} updated, ${skipped} unchanged`)
}

async function main() {
  try {
    const spec = loadOpenAPISpec()

    console.log('Extracting endpoints and parameters from spec...')
    const specEndpoints = extractSpecEndpointsWithParams(spec)
    console.log(`Found ${Object.keys(specEndpoints).length} endpoints in spec`)

    console.log('Extracting implemented endpoints and parameters...')
    const implEndpoints = extractImplementedEndpointsWithParams()
    console.log(`Found ${Object.keys(implEndpoints).length} implemented endpoints`)

    console.log('Comparing...')
    const results = compareAll(specEndpoints, implEndpoints)

    const hasIssues = printResults(results)

    // Create GitHub issues if explicitly enabled (via CREATE_ISSUES env var)
    if (process.env.CREATE_ISSUES === 'true' && hasIssues) {
      await createGitHubIssues(results)
    }

    // Exit with non-zero code if issues found (so workflow can detect changes)
    process.exit(hasIssues ? 1 : 0)

  } catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
