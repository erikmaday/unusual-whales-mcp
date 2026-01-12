#!/usr/bin/env node

/**
 * Simplified API Sync Checker for Discriminated Union Schemas
 *
 * This is a dramatically simplified version designed for our explicit per-action
 * schemas using z.discriminatedUnion().
 *
 * **Size Improvement**: 3,038 lines → 417 lines (86% reduction!)
 *
 * **Why So Much Smaller?**
 * The original checker was 3,000+ lines because it had to:
 * - Parse and track schema composition (.merge, .extend, .pick, .omit)
 * - Resolve which filter schemas were merged into which tool schemas
 * - Handle .refine() calls with conditional validation
 * - Track parameter sources through complex composition chains
 *
 * With explicit schemas, checking is straightforward:
 * 1. Extract action schemas from discriminated unions (direct properties!)
 * 2. Map actions to API endpoints (from handler code)
 * 3. Compare parameters directly (no composition tracking needed)
 *
 * Each action schema is a complete, self-contained specification with all
 * parameters explicitly listed, making validation trivial.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const SPEC_FILE = join(ROOT_DIR, 'uw-api-spec.yaml')

// Endpoints we intentionally don't implement
const IGNORED_ENDPOINTS = [
  '/api/socket',
  '/api/socket/flow_alerts',
  '/api/socket/gex',
  '/api/socket/news',
  '/api/socket/option_trades',
  '/api/socket/price',
]

/**
 * Load and parse the OpenAPI spec
 */
function loadOpenAPISpec() {
  console.log('Loading OpenAPI spec...')
  const text = readFileSync(SPEC_FILE, 'utf-8')
  return YAML.parse(text)
}

/**
 * Extract all endpoints and their parameters from the OpenAPI spec
 */
function extractSpecEndpoints(spec) {
  const endpoints = new Map()

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    if (IGNORED_ENDPOINTS.includes(path)) continue

    for (const [method, details] of Object.entries(methods)) {
      if (method === 'parameters' || !details.parameters) continue

      const params = {
        required: new Set(),
        optional: new Set(),
        all: new Set()
      }

      for (const param of details.parameters) {
        // Resolve $ref if needed
        const resolved = param.$ref ? resolveRef(param.$ref, spec) : param
        if (!resolved) continue

        const name = resolved.name
        params.all.add(name)

        if (resolved.required) {
          params.required.add(name)
        } else {
          params.optional.add(name)
        }
      }

      endpoints.set(`${method.toUpperCase()} ${path}`, {
        path,
        method: method.toUpperCase(),
        operationId: details.operationId,
        params
      })
    }
  }

  console.log(`Found ${endpoints.size} endpoints in spec`)
  return endpoints
}

/**
 * Resolve a $ref in the OpenAPI spec
 */
function resolveRef(ref, spec) {
  if (!ref || !ref.startsWith('#/')) return null

  const path = ref.substring(2).split('/')
  let current = spec

  for (const segment of path) {
    if (!current || !(segment in current)) return null
    current = current[segment]
  }

  return current
}

/**
 * Extract action schemas from a tool file's discriminated union
 * Returns: { actionName: { required: Set, optional: Set, all: Set } }
 */
function extractActionSchemas(toolFile) {
  const content = readFileSync(toolFile, 'utf-8')
  const actions = new Map()

  // Find discriminated union definition
  // Pattern: z.discriminatedUnion("action", [...])
  const unionMatch = content.match(/z\.discriminatedUnion\("action",\s*\[([\s\S]*?)\]\)/)
  if (!unionMatch) {
    console.warn(`No discriminated union found in ${toolFile}`)
    return actions
  }

  // Extract schema names from the union array
  const schemaNames = unionMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('//'))

  // For each schema name, find its definition and extract parameters
  for (const schemaName of schemaNames) {
    // Find schema definition: const schemaName = z.object({...})
    const schemaPattern = new RegExp(
      `const\\s+${schemaName}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\)`,
      ''
    )
    const schemaMatch = content.match(schemaPattern)
    if (!schemaMatch) continue

    const schemaBody = schemaMatch[1]

    // Extract action name from z.literal()
    const actionMatch = schemaBody.match(/action:\s*z\.literal\("(\w+)"\)/)
    if (!actionMatch) continue

    const actionName = actionMatch[1]

    // Extract parameters
    const params = {
      required: new Set(),
      optional: new Set(),
      all: new Set()
    }

    // Match parameter definitions: paramName: ...
    const paramPattern = /\n\s*(\w+):\s*([^\n]+)/g
    let match

    while ((match = paramPattern.exec(schemaBody)) !== null) {
      const paramName = match[1]
      const paramDef = match[2]

      // Skip the 'action' field itself
      if (paramName === 'action') continue

      params.all.add(paramName)

      if (paramDef.includes('.optional()')) {
        params.optional.add(paramName)
      } else {
        params.required.add(paramName)
      }
    }

    actions.set(actionName, params)
  }

  return actions
}

/**
 * Extract handler implementations to map actions to API endpoints
 * Returns: { actionName: "/api/path" }
 */
function extractActionToEndpoint(toolFile) {
  const content = readFileSync(toolFile, 'utf-8')
  const mapping = new Map()

  // Pattern 1: Direct uwFetch with string literal
  // actionName: async (data) => { return uwFetch("/api/path", ...) }
  const directPattern = /(\w+):\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?uwFetch\("([^"]+)"/g
  let match

  while ((match = directPattern.exec(content)) !== null) {
    const actionName = match[1]
    const endpoint = match[2]
    mapping.set(actionName, endpoint)
  }

  // Pattern 2: PathParamBuilder.build()
  // const path = new PathParamBuilder()...build("/api/path")
  // Look for action handlers that use PathParamBuilder
  const builderPattern = /(\w+):\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\.build\("([^"]+)"\)/g

  while ((match = builderPattern.exec(content)) !== null) {
    const actionName = match[1]
    const endpoint = match[2]
    mapping.set(actionName, endpoint)
  }

  return mapping
}

/**
 * Process all tool files and extract action schemas + endpoint mappings
 */
function extractImplementedActions() {
  const toolsDir = join(ROOT_DIR, 'src', 'tools')
  const files = readdirSync(toolsDir).filter(
    f => f.endsWith('.ts') && f !== 'index.ts' && !f.startsWith('base')
  )

  const allActions = new Map() // actionName -> { file, params, endpoint }

  for (const file of files) {
    const filePath = join(toolsDir, file)
    const actions = extractActionSchemas(filePath)
    const endpoints = extractActionToEndpoint(filePath)

    for (const [actionName, params] of actions) {
      const endpoint = endpoints.get(actionName)
      if (!endpoint) {
        console.warn(`No endpoint mapping found for action: ${actionName} in ${file}`)
        continue
      }

      allActions.set(actionName, {
        file,
        params,
        endpoint
      })
    }
  }

  console.log(`Found ${allActions.size} implemented actions`)
  return allActions
}

/**
 * Compare implemented actions against spec endpoints
 */
function compareAPIs(specEndpoints, implementedActions) {
  const results = {
    missingEndpoints: [],
    extraEndpoints: [],
    parameterMismatches: []
  }

  // Track which spec endpoints we've checked
  const checkedSpec = new Set()

  // For each implemented action, find its spec endpoint and compare
  for (const [actionName, impl] of implementedActions) {
    const endpoint = impl.endpoint
    const specKey = `GET ${endpoint}` // Most are GET, adjust if needed

    const spec = specEndpoints.get(specKey)
    if (!spec) {
      // Try POST
      const postKey = `POST ${endpoint}`
      if (specEndpoints.has(postKey)) {
        checkedSpec.add(postKey)
        compareParameters(actionName, impl, specEndpoints.get(postKey), results)
      } else {
        results.extraEndpoints.push({
          action: actionName,
          endpoint,
          file: impl.file
        })
      }
    } else {
      checkedSpec.add(specKey)
      compareParameters(actionName, impl, spec, results)
    }
  }

  // Find spec endpoints we haven't implemented
  for (const [key, spec] of specEndpoints) {
    if (!checkedSpec.has(key) && !IGNORED_ENDPOINTS.includes(spec.path)) {
      results.missingEndpoints.push({
        endpoint: spec.path,
        method: spec.method,
        operationId: spec.operationId
      })
    }
  }

  return results
}

/**
 * Compare parameters between implementation and spec
 */
function compareParameters(actionName, impl, spec, results) {
  const missing = {
    required: [],
    optional: []
  }
  const extra = []

  // Check for missing parameters (in spec but not in impl)
  for (const param of spec.params.required) {
    if (!impl.params.all.has(param)) {
      missing.required.push(param)
    }
  }

  for (const param of spec.params.optional) {
    if (!impl.params.all.has(param)) {
      missing.optional.push(param)
    }
  }

  // Check for extra parameters (in impl but not in spec)
  for (const param of impl.params.all) {
    if (!spec.params.all.has(param)) {
      extra.push(param)
    }
  }

  if (missing.required.length > 0 || missing.optional.length > 0 || extra.length > 0) {
    results.parameterMismatches.push({
      action: actionName,
      endpoint: impl.endpoint,
      file: impl.file,
      missing,
      extra
    })
  }
}

/**
 * Print results in a readable format
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60))
  console.log('API SYNC CHECK RESULTS')
  console.log('='.repeat(60) + '\n')

  if (results.missingEndpoints.length > 0) {
    console.log(`❌ Missing Endpoints (${results.missingEndpoints.length}):`)
    for (const item of results.missingEndpoints) {
      console.log(`   - ${item.method} ${item.endpoint}`)
      if (item.operationId) console.log(`     (${item.operationId})`)
    }
    console.log()
  }

  if (results.extraEndpoints.length > 0) {
    console.log(`⚠️  Extra Endpoints (${results.extraEndpoints.length}):`)
    for (const item of results.extraEndpoints) {
      console.log(`   - ${item.action} -> ${item.endpoint}`)
      console.log(`     (in ${item.file})`)
    }
    console.log()
  }

  if (results.parameterMismatches.length > 0) {
    console.log(`⚠️  Parameter Mismatches (${results.parameterMismatches.length}):`)
    for (const item of results.parameterMismatches) {
      console.log(`   ${item.action} (${item.endpoint}):`)
      if (item.missing.required.length > 0) {
        console.log(`     ❌ Missing required: ${item.missing.required.join(', ')}`)
      }
      if (item.missing.optional.length > 0) {
        console.log(`     ⚠️  Missing optional: ${item.missing.optional.join(', ')}`)
      }
      if (item.extra.length > 0) {
        console.log(`     ➕ Extra params: ${item.extra.join(', ')}`)
      }
    }
    console.log()
  }

  const totalIssues = results.missingEndpoints.length +
    results.extraEndpoints.length +
    results.parameterMismatches.length

  if (totalIssues === 0) {
    console.log('✅ All checks passed! API implementation matches spec.\n')
    return 0
  } else {
    console.log(`❌ Found ${totalIssues} issues\n`)
    return 1
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const spec = loadOpenAPISpec()
    const specEndpoints = extractSpecEndpoints(spec)
    const implementedActions = extractImplementedActions()

    const results = compareAPIs(specEndpoints, implementedActions)
    const exitCode = printResults(results)

    process.exit(exitCode)
  } catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
