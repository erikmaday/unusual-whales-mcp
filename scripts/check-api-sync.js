#!/usr/bin/env node

/**
 * API Sync Checker for Discriminated Union Schemas
 *
 * Compares the UnusualWhales OpenAPI spec against implemented endpoints,
 * checking both endpoint coverage and parameter coverage.
 *
 * Size: 417 lines (down from 3,038 lines in the original composition-based version)
 *
 * Why So Small?
 * With explicit per-action schemas using z.discriminatedUnion(), validation is straightforward:
 * 1. Extract action schemas from discriminated unions (direct property access)
 * 2. Map actions to API endpoints (parse handler code)
 * 3. Compare parameters directly (no composition tracking needed)
 *
 * Each action schema is a complete, self-contained specification with all parameters
 * explicitly listed, making validation trivial compared to the old composition-based approach.
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

/**
 * Load and parse the OpenAPI spec
 */
function loadOpenAPISpec() {
  console.log('Loading OpenAPI spec...')
  try {
    const text = readFileSync(SPEC_FILE, 'utf-8')
    return YAML.parse(text)
  } catch (error) {
    console.error(`Failed to load OpenAPI spec: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Resolve a $ref path in the OpenAPI spec
 */
function resolveRef(ref, spec) {
  if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null

  const path = ref.substring(2).split('/')
  let current = spec

  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return null
    }
    current = current[segment]
  }

  return current
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
        const resolved = param.$ref ? resolveRef(param.$ref, spec) : param
        if (!resolved?.name) continue

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
 * Extract action schemas from a tool file's discriminated union
 * Returns: Map<actionName, { required: Set, optional: Set, all: Set }>
 */
function extractActionSchemas(toolFile) {
  const actions = new Map()

  try {
    const content = readFileSync(toolFile, 'utf-8')

    // Find discriminated union: z.discriminatedUnion("action", [...])
    const unionMatch = content.match(/z\.discriminatedUnion\("action",\s*\[([\s\S]*?)\]\)/)
    if (!unionMatch) {
      console.warn(`No discriminated union found in ${toolFile}`)
      return actions
    }

    // Extract schema names from the union array
    const schemaNames = unionMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('//') && !s.startsWith('/*'))

    // For each schema, find its definition and extract parameters
    for (const schemaName of schemaNames) {
      try {
        // Escape special regex characters in schema name (like $)
        const escapedName = schemaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        // Find: const schemaName = z.object({...})
        const schemaPattern = new RegExp(
          `const\\s+${escapedName}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\)`,
          ''
        )
        const schemaMatch = content.match(schemaPattern)
        if (!schemaMatch) continue

        const schemaBody = schemaMatch[1]

        // Extract action name from: action: z.literal("action_name")
        const actionMatch = schemaBody.match(/action:\s*z\.literal\(["'](\w+)["']\)/)
        if (!actionMatch) continue

        const actionName = actionMatch[1]
        const params = {
          required: new Set(),
          optional: new Set(),
          all: new Set()
        }

        // Extract parameters: paramName: schemaDefinition
        // Handles multi-line definitions by matching until comma or end
        const lines = schemaBody.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line || line.startsWith('//') || line.startsWith('/*')) continue

          const paramMatch = line.match(/^(\w+):\s*(.+)/)
          if (!paramMatch) continue

          const paramName = paramMatch[1]
          let paramDef = paramMatch[2]

          // Skip the 'action' field itself
          if (paramName === 'action') continue

          // If the definition doesn't end with a comma, it might span multiple lines
          // Collect the full definition
          if (!paramDef.endsWith(',')) {
            let j = i + 1
            while (j < lines.length && !lines[j].trim().match(/,\s*$/)) {
              paramDef += ' ' + lines[j].trim()
              j++
            }
            if (j < lines.length) {
              paramDef += ' ' + lines[j].trim()
            }
          }

          params.all.add(paramName)

          if (paramDef.includes('.optional()')) {
            params.optional.add(paramName)
          } else {
            params.required.add(paramName)
          }
        }

        actions.set(actionName, params)
      } catch (error) {
        console.warn(`Error processing schema ${schemaName}: ${error.message}`)
      }
    }
  } catch (error) {
    console.warn(`Error reading file ${toolFile}: ${error.message}`)
  }

  return actions
}

/**
 * Extract handler implementations to map actions to API endpoints
 * Returns: Map<actionName, endpoint>
 *
 * This manually parses the handler object to avoid regex issues with
 * multi-line patterns and nested braces.
 */
function extractActionToEndpoint(toolFile) {
  const mapping = new Map()

  try {
    const content = readFileSync(toolFile, 'utf-8')

    // Find the handler export block
    const handlerStart = content.indexOf('createToolHandler(')
    if (handlerStart === -1) return mapping

    // Find the comma separating the two arguments at top level (not inside parens/braces)
    let parenDepth = 1 // Start at 1 because we're inside createToolHandler(
    let braceDepth = 0
    let bracketDepth = 0
    let argSeparatorPos = -1

    for (let i = handlerStart + 'createToolHandler('.length; i < content.length; i++) {
      const char = content[i]

      if (char === '(') parenDepth++
      else if (char === ')') {
        parenDepth--
        if (parenDepth === 0) break // End of createToolHandler call
      }
      else if (char === '{') braceDepth++
      else if (char === '}') braceDepth--
      else if (char === '[') bracketDepth++
      else if (char === ']') bracketDepth--
      else if (char === ',' && parenDepth === 1 && braceDepth === 0 && bracketDepth === 0) {
        argSeparatorPos = i
        break
      }
    }

    if (argSeparatorPos === -1) return mapping

    // Find the opening { of handlers object after the comma
    let handlersStart = -1
    for (let i = argSeparatorPos + 1; i < content.length; i++) {
      if (content[i] === '{') {
        handlersStart = i
        break
      }
    }

    if (handlersStart === -1) return mapping

    // Find matching closing brace for handlers object
    braceDepth = 1
    let handlersEnd = -1
    for (let i = handlersStart + 1; i < content.length; i++) {
      if (content[i] === '{') braceDepth++
      if (content[i] === '}') {
        braceDepth--
        if (braceDepth === 0) {
          handlersEnd = i
          break
        }
      }
    }

    if (handlersEnd === -1) return mapping

    const handlersBlock = content.substring(handlersStart + 1, handlersEnd)

    // Extract handlers using line-by-line parsing
    const lines = handlersBlock.split('\n')
    let currentAction = null
    let currentBody = []
    let handlerBraceDepth = 0

    for (const line of lines) {
      // Check if this line starts a new handler
      const actionMatch = line.match(/^\s*(\w+):\s*async\s*\(/)
      if (actionMatch && handlerBraceDepth === 0) {
        // Process previous handler if exists
        if (currentAction && currentBody.length > 0) {
          const body = currentBody.join('\n')
          const endpoint = extractEndpointFromBody(body)
          if (endpoint) mapping.set(currentAction, endpoint)
        }
        // Start new handler
        currentAction = actionMatch[1]
        currentBody = [line]
      } else if (currentAction) {
        currentBody.push(line)
      }

      // Track brace depth (ignore braces inside strings)
      let inString = false
      let stringChar = null
      let escaped = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (escaped) {
          escaped = false
          continue
        }

        if (char === '\\') {
          escaped = true
          continue
        }

        if ((char === '"' || char === "'" || char === '`') && !inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar && inString) {
          inString = false
          stringChar = null
        } else if (!inString) {
          if (char === '{') handlerBraceDepth++
          if (char === '}') handlerBraceDepth--
        }
      }
    }

    // Process last handler
    if (currentAction && currentBody.length > 0) {
      const body = currentBody.join('\n')
      const endpoint = extractEndpointFromBody(body)
      if (endpoint) mapping.set(currentAction, endpoint)
    }

  } catch (error) {
    console.warn(`Error extracting endpoints from ${toolFile}: ${error.message}`)
  }

  return mapping
}

/**
 * Extract endpoint from handler body
 */
function extractEndpointFromBody(body) {
  // Check for PathParamBuilder.build() first
  const buildMatch = body.match(/\.build\(["']([^"']+)["']\)/)
  if (buildMatch) return buildMatch[1]

  // Otherwise check for direct uwFetch with string literal
  const uwFetchMatch = body.match(/uwFetch\(["']([^"']+)["']/)
  if (uwFetchMatch) return uwFetchMatch[1]

  return null
}

/**
 * Process all tool files and extract action schemas + endpoint mappings
 */
function extractImplementedActions() {
  const toolsDir = join(ROOT_DIR, 'src', 'tools')
  const files = readdirSync(toolsDir).filter(
    f => f.endsWith('.ts') && f !== 'index.ts' && !f.startsWith('base')
  )

  const allActions = new Map() // `${file}:${actionName}` -> { file, actionName, params, endpoint }

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

      // Use composite key to handle duplicate action names across different tools
      const key = `${file}:${actionName}`
      allActions.set(key, {
        file,
        actionName,
        params,
        endpoint
      })
    }
  }

  console.log(`Found ${allActions.size} implemented actions`)
  return allActions
}

/**
 * Normalize parameter name by removing array notation suffix
 * OpenAPI uses "param[]" for arrays, but MCP schemas use "param"
 */
function normalizeParamName(param) {
  return param.endsWith('[]') ? param.slice(0, -2) : param
}

/**
 * Compare parameters between implementation and spec
 */
function compareParameters(actionName, impl, spec, results) {
  const missing = { required: [], optional: [] }
  const extra = []

  // Check for missing parameters (in spec but not in impl)
  // Normalize spec param names by removing [] suffix
  for (const param of spec.params.required) {
    const normalizedParam = normalizeParamName(param)
    if (!impl.params.all.has(normalizedParam)) {
      missing.required.push(param)
    }
  }

  for (const param of spec.params.optional) {
    const normalizedParam = normalizeParamName(param)
    if (!impl.params.all.has(normalizedParam)) {
      missing.optional.push(param)
    }
  }

  // Check for extra parameters (in impl but not in spec)
  // For each impl param, check if spec has it with or without [] suffix
  for (const param of impl.params.all) {
    const withBrackets = `${param}[]`
    if (!spec.params.all.has(param) && !spec.params.all.has(withBrackets)) {
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
 * Compare implemented actions against spec endpoints
 */
function compareAPIs(specEndpoints, implementedActions) {
  const results = {
    missingEndpoints: [],
    extraEndpoints: [],
    parameterMismatches: []
  }

  const checkedSpec = new Set()

  // For each implemented action, find its spec endpoint and compare
  for (const [key, impl] of implementedActions) {
    const endpoint = impl.endpoint
    const actionName = impl.actionName

    // Try GET first (most common), then POST
    let specKey = `GET ${endpoint}`
    let spec = specEndpoints.get(specKey)

    if (!spec) {
      specKey = `POST ${endpoint}`
      spec = specEndpoints.get(specKey)
    }

    if (!spec) {
      results.extraEndpoints.push({
        action: actionName,
        endpoint,
        file: impl.file
      })
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
    console.error('Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
