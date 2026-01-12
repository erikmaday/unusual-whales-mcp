#!/usr/bin/env node

/**
 * Checks if our tool implementations match the Unusual Whales OpenAPI spec.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const SPEC_FILE = join(ROOT_DIR, 'uw-api-spec.yaml')

// Skip these - websockets we can't support, plus some deprecated stuff
const IGNORED_ENDPOINTS = [
  '/api/socket',
  '/api/socket/flow_alerts',
  '/api/socket/gex',
  '/api/socket/news',
  '/api/socket/option_trades',
  '/api/socket/price',
  // Old endpoints that have newer versions
  '/api/stock/{ticker}/flow-alerts',
  '/api/stock/{ticker}/spot-exposures/{expiry}/strike',
]

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

// Follow $ref pointers in the spec
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

// Pull out all endpoints from the spec with their params
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

// Parse a tool file and pull out all the action schemas from its discriminated union
function extractActionSchemas(toolFile) {
  const actions = new Map()

  try {
    const content = readFileSync(toolFile, 'utf-8')

    // Find the discriminated union
    const unionMatch = content.match(/z\.discriminatedUnion\("action_type",\s*\[([\s\S]*?)\]\)/)
    if (!unionMatch) {
      console.warn(`No discriminated union found in ${toolFile}`)
      return actions
    }

    const schemaNames = unionMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('//') && !s.startsWith('/*'))

    for (const schemaName of schemaNames) {
      try {
        // Handle schema names with special chars like $
        const escapedName = schemaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        const schemaPattern = new RegExp(
          `const\\s+${escapedName}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\)`,
          ''
        )
        const schemaMatch = content.match(schemaPattern)
        if (!schemaMatch) continue

        const schemaBody = schemaMatch[1]
        const actionMatch = schemaBody.match(/action_type: z.literal\(["'](\w+)["']\)/)
        if (!actionMatch) continue

        const actionName = actionMatch[1]
        const params = {
          required: new Set(),
          optional: new Set(),
          all: new Set()
        }

        // Go through each line looking for param definitions
        const lines = schemaBody.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line || line.startsWith('//') || line.startsWith('/*')) continue

          const paramMatch = line.match(/^(\w+):\s*(.+)/)
          if (!paramMatch) continue

          const paramName = paramMatch[1]
          let paramDef = paramMatch[2]

          if (paramName === 'action_type') continue

          // Multi-line definitions - keep reading until we hit a comma
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

// Figure out which API endpoint each action calls by parsing the handler code
function extractActionToEndpoint(toolFile) {
  const mapping = new Map()

  try {
    const content = readFileSync(toolFile, 'utf-8')

    const handlerStart = content.indexOf('createToolHandler(')
    if (handlerStart === -1) return mapping

    // Walk through to find where the handlers object starts (tracking nesting depth)
    let parenDepth = 1
    let braceDepth = 0
    let bracketDepth = 0
    let argSeparatorPos = -1

    for (let i = handlerStart + 'createToolHandler('.length; i < content.length; i++) {
      const char = content[i]

      if (char === '(') parenDepth++
      else if (char === ')') {
        parenDepth--
        if (parenDepth === 0) break
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

    let handlersStart = -1
    for (let i = argSeparatorPos + 1; i < content.length; i++) {
      if (content[i] === '{') {
        handlersStart = i
        break
      }
    }

    if (handlersStart === -1) return mapping

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
    const lines = handlersBlock.split('\n')
    let currentAction = null
    let currentBody = []
    let handlerBraceDepth = 0

    for (const line of lines) {
      const actionMatch = line.match(/^\s*(\w+):\s*async\s*\(/)
      if (actionMatch && handlerBraceDepth === 0) {
        if (currentAction && currentBody.length > 0) {
          const body = currentBody.join('\n')
          const endpoint = extractEndpointFromBody(body)
          if (endpoint) mapping.set(currentAction, endpoint)
        }
        currentAction = actionMatch[1]
        currentBody = [line]
      } else if (currentAction) {
        currentBody.push(line)
      }

      // Track braces but ignore ones inside strings
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

    // Don't forget the last one
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

// Look for the endpoint URL in a handler body
function extractEndpointFromBody(body) {
  // PathParamBuilder.build() or direct uwFetch call
  const buildMatch = body.match(/\.build\(["']([^"']+)["']\)/)
  if (buildMatch) return buildMatch[1]

  const uwFetchMatch = body.match(/uwFetch\(["']([^"']+)["']/)
  if (uwFetchMatch) return uwFetchMatch[1]

  return null
}

// Go through all tool files and build a map of what we've implemented
function extractImplementedActions() {
  const toolsDir = join(ROOT_DIR, 'src', 'tools')
  const files = readdirSync(toolsDir).filter(
    f => f.endsWith('.ts') && f !== 'index.ts' && !f.startsWith('base')
  )

  const allActions = new Map()

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

// OpenAPI uses "param[]" for arrays, we just use "param"
function normalizeParamName(param) {
  return param.endsWith('[]') ? param.slice(0, -2) : param
}

function compareParameters(actionName, impl, spec, results) {
  const missing = { required: [], optional: [] }
  const extra = []

  // What's in the spec that we're missing?
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

  // What do we have that's not in the spec?
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

// The main comparison - match up our actions with spec endpoints
function compareAPIs(specEndpoints, implementedActions) {
  const results = {
    missingEndpoints: [],
    extraEndpoints: [],
    parameterMismatches: []
  }

  const checkedSpec = new Set()

  for (const [key, impl] of implementedActions) {
    const endpoint = impl.endpoint
    const actionName = impl.actionName

    // Most are GET, but check POST too
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

  // What's in the spec that we haven't touched?
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
