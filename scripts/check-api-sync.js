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
 * Resolve a $ref path in the OpenAPI spec
 * @param {string} ref - The $ref path (e.g., '#/components/schemas/Tide Type')
 * @param {object} spec - The full OpenAPI spec object
 * @param {Set} visited - Set of visited refs to detect circular references
 * @returns {object|null} The resolved schema object, or null if not found
 */
function resolveRef(ref, spec, visited = new Set()) {
  if (!ref || typeof ref !== 'string') return null

  // Detect circular references
  if (visited.has(ref)) {
    console.warn(`Circular reference detected: ${ref}`)
    return null
  }
  visited.add(ref)

  // Only support internal references starting with #/
  if (!ref.startsWith('#/')) {
    console.warn(`External references not supported: ${ref}`)
    return null
  }

  // Parse the path carefully to handle schema names with slashes
  // For OpenAPI, the structure is typically #/components/schemas/{schemaName}
  // where {schemaName} might contain slashes
  const refPath = ref.substring(2) // Remove '#/'

  // Try to match the standard OpenAPI pattern
  const standardMatch = refPath.match(/^(components\/schemas|components\/parameters|components\/responses)\/(.+)$/)

  let path
  if (standardMatch) {
    // Split the prefix and keep the schema name intact
    const prefix = standardMatch[1].split('/')
    const schemaName = standardMatch[2]
    path = [...prefix, schemaName]
  } else {
    // Fallback to simple split for other cases
    path = refPath.split('/')
  }

  // Navigate the spec object following the path
  let current = spec
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment]
    } else {
      console.warn(`Reference path not found: ${ref}`)
      return null
    }
  }

  // If the resolved object itself contains a $ref, resolve it recursively
  if (current && typeof current === 'object' && current.$ref) {
    return resolveRef(current.$ref, spec, visited)
  }

  return current
}

/**
 * Extract schema information from a parameter
 * @param {object} param - The parameter object from OpenAPI spec
 * @param {object} spec - The full OpenAPI spec for resolving $refs
 * @returns {object} Schema info including enum, type, constraints
 */
function extractParamSchema(param, spec) {
  const schema = {}

  // Get the schema object, resolving $ref if needed
  let paramSchema = param.schema
  if (paramSchema?.$ref) {
    paramSchema = resolveRef(paramSchema.$ref, spec)
  }

  if (!paramSchema) return schema

  // Extract enum values
  if (paramSchema.enum) {
    schema.enum = paramSchema.enum
  }

  // Extract type
  if (paramSchema.type) {
    schema.type = paramSchema.type
  }

  // Extract numeric constraints
  if (paramSchema.minimum !== undefined) {
    schema.minimum = paramSchema.minimum
  }
  if (paramSchema.maximum !== undefined) {
    schema.maximum = paramSchema.maximum
  }

  // Extract string constraints
  if (paramSchema.pattern) {
    schema.pattern = paramSchema.pattern
  }
  if (paramSchema.format) {
    schema.format = paramSchema.format
  }

  // Extract default value
  if (paramSchema.default !== undefined) {
    schema.default = paramSchema.default
  }

  return schema
}

/**
 * Extract deprecated information from endpoint description
 * @param {string} description - The endpoint description
 * @returns {object} Deprecation info with message and replacement endpoint
 */
function extractDeprecationInfo(description) {
  if (!description) return null

  const lowerDesc = description.toLowerCase()
  if (!lowerDesc.includes('deprecated')) return null

  const info = {
    deprecated: true,
    message: '',
    replacementEndpoint: null
  }

  // Extract the full deprecation message (first paragraph usually)
  const lines = description.trim().split('\n')
  info.message = lines[0].trim()

  // Try to find replacement endpoint URL
  const urlMatch = description.match(/https:\/\/api\.unusualwhales\.com\/docs#\/operations\/([^\s\)\]]+)/)
  if (urlMatch) {
    info.replacementUrl = urlMatch[0]
  }

  // Try to extract replacement endpoint path from description
  const pathMatch = description.match(/\/api\/[^\s\)]+/)
  if (pathMatch) {
    info.replacementEndpoint = pathMatch[0]
  }

  return info
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
      schemas: {}, // Store schema info for each parameter
    }

    // Check for deprecation
    const deprecationInfo = extractDeprecationInfo(getMethod.description)
    if (deprecationInfo) {
      params.deprecated = true
      params.deprecationMessage = deprecationInfo.message
      params.replacementEndpoint = deprecationInfo.replacementEndpoint
      params.replacementUrl = deprecationInfo.replacementUrl
    }

    for (const param of getMethod.parameters || []) {
      const paramName = param.name
      const isRequired = param.required === true

      // Extract schema information
      const schemaInfo = extractParamSchema(param, spec)
      if (Object.keys(schemaInfo).length > 0) {
        params.schemas[paramName] = schemaInfo
      }

      // Check if individual parameter is deprecated
      if (param.deprecated === true || extractDeprecationInfo(param.description)) {
        if (!schemaInfo.deprecated) {
          schemaInfo.deprecated = true
          const paramDeprecationInfo = extractDeprecationInfo(param.description)
          if (paramDeprecationInfo) {
            schemaInfo.deprecationMessage = paramDeprecationInfo.message
          }
        }
      }

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

  // Remove single-line comments to avoid false matches
  const cleanBlock = block.replace(/\/\/[^\n]*/g, '')

  // Check if block contains key-value pairs (has colons)
  const hasKeyValuePairs = cleanBlock.includes(':')

  if (hasKeyValuePairs) {
    // Extract quoted keys: "param[]": value or 'param[]': value
    // The key (including []) is the API parameter name
    const quotedKeyPattern = /["']([^"']+)["']\s*:/g
    let match
    while ((match = quotedKeyPattern.exec(cleanBlock)) !== null) {
      const paramName = match[1] // Keep [] suffix - it's part of the param name
      if (paramName && !params.includes(paramName)) {
        params.push(paramName)
      }
    }

    // Extract unquoted keys: param: value
    // But skip keys we already got from quoted pattern
    const unquotedKeyPattern = /(?<![."'])(\w+)\s*:/g
    while ((match = unquotedKeyPattern.exec(cleanBlock)) !== null) {
      const paramName = match[1]
      if (paramName && !params.includes(paramName)) {
        params.push(paramName)
      }
    }

    // Also check for shorthand properties (just a variable name, no colon)
    const parts = cleanBlock.split(',')
    for (const part of parts) {
      const trimmed = part.trim()
      // Skip empty parts, key-value pairs, or parts with dots (like data.foo)
      if (!trimmed || trimmed.includes(':') || trimmed.includes('.')) continue
      // Must be just a simple identifier
      const wordMatch = trimmed.match(/^(\w+)$/)
      if (wordMatch) {
        const paramName = wordMatch[1]
        if (paramName && !params.includes(paramName)) {
          params.push(paramName)
        }
      }
    }
  } else {
    // Simple shorthand: { param1, param2 }
    const names = cleanBlock.split(',').map(s => s.trim()).filter(Boolean)
    for (const name of names) {
      if (/^\w+$/.test(name) && !params.includes(name)) {
        params.push(name)
      }
    }
  }

  return params
}

/**
 * Extract enum values from schema files
 */
function extractSchemaEnums() {
  const schemasDir = join(ROOT_DIR, 'src', 'schemas')
  const files = readdirSync(schemasDir).filter(f => f.endsWith('.ts'))

  const enums = {}

  for (const file of files) {
    const content = readFileSync(join(schemasDir, file), 'utf-8')

    // Pattern to match z.enum([...]) with variable name
    // Examples:
    // export const optionTypeSchema = z.enum(["call", "put"])
    // const tideTypeSchema = z.enum(['all', 'equity_only'])
    const enumPattern = /(?:export\s+)?const\s+(\w+Schema)\s*=\s*z\.enum\(\s*\[([^\]]+)\]\s*\)/g

    let match
    while ((match = enumPattern.exec(content)) !== null) {
      const schemaName = match[1]
      const enumValues = match[2]

      // Extract the actual enum values from the array
      const values = []
      const valuePattern = /["']([^"']+)["']/g
      let valueMatch
      while ((valueMatch = valuePattern.exec(enumValues)) !== null) {
        values.push(valueMatch[1])
      }

      if (values.length > 0) {
        enums[schemaName] = {
          file,
          values,
        }
      }
    }
  }

  return enums
}

/**
 * Try to find the schema variable name for a parameter
 * by looking at tool files
 */
function findSchemaForParam(paramName, toolFile) {
  const toolsDir = join(ROOT_DIR, 'src', 'tools')
  const content = readFileSync(join(toolsDir, toolFile), 'utf-8')

  // Look for patterns like:
  // tide_type: tideTypeSchema
  // option_type: optionTypeSchema
  // The pattern is: paramName: schemaName
  const pattern = new RegExp(`${paramName}\\s*:\\s*(\\w+Schema)`, 'i')
  const match = content.match(pattern)

  if (match) {
    return match[1]
  }

  // Try camelCase conversion: tide_type -> tideTypeSchema
  const camelCase = paramName.split('_').map((word, i) => {
    if (i === 0) return word
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join('')
  const expectedSchemaName = camelCase + 'Schema'

  // Check if this schema exists in the file (might be imported)
  if (content.includes(expectedSchemaName)) {
    return expectedSchemaName
  }

  return null
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
function compareAll(specEndpoints, implEndpoints, schemaEnums) {
  const results = {
    missingEndpoints: [],
    extraEndpoints: [],
    missingRequiredParams: [],
    missingOptionalParams: [],
    extraParams: [],
    deprecatedEndpoints: [], // Track deprecated endpoints still implemented
    deprecatedParameters: [], // Track deprecated parameters still in use
    missingEnumValues: [],
    extraEnumValues: [],
    summary: {
      totalSpecEndpoints: Object.keys(specEndpoints).length,
      totalImplEndpoints: Object.keys(implEndpoints).length,
      endpointsCovered: 0,
      requiredParamsMissing: 0,
      optionalParamsMissing: 0,
      extraParams: 0,
      deprecatedEndpointsInUse: 0,
      deprecatedParametersInUse: 0,
      enumValuesMissing: 0,
      enumValuesExtra: 0,
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

    // Check if endpoint is deprecated
    if (specParams.deprecated) {
      results.deprecatedEndpoints.push({
        endpoint: specEndpoint,
        file: implData.file,
        operationId: specParams.operationId,
        message: specParams.deprecationMessage,
        replacementEndpoint: specParams.replacementEndpoint,
        replacementUrl: specParams.replacementUrl,
      })
      results.summary.deprecatedEndpointsInUse++
    }

    // Check for deprecated parameters being used
    for (const paramName of passedParams) {
      const cleanParamName = paramName.replace('[]', '')
      const paramSchema = specParams.schemas[cleanParamName] || specParams.schemas[paramName]
      if (paramSchema?.deprecated) {
        results.deprecatedParameters.push({
          endpoint: specEndpoint,
          param: paramName,
          file: implData.file,
          operationId: specParams.operationId,
          message: paramSchema.deprecationMessage,
        })
        results.summary.deprecatedParametersInUse++
      }
    }

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

    // Check enum values for parameters that have enums in the spec
    for (const paramName of [...specParams.required, ...specParams.optional]) {
      const paramSchema = specParams.schemas[paramName]
      if (!paramSchema?.enum) continue // Skip params without enum

      // Find the schema variable used for this parameter in the implementation
      const schemaVarName = findSchemaForParam(paramName, implData.file)
      if (!schemaVarName) {
        // No enum schema found in implementation
        results.missingEnumValues.push({
          endpoint: specEndpoint,
          param: paramName,
          file: implData.file,
          operationId: specParams.operationId,
          specEnum: paramSchema.enum,
          implEnum: null,
          missing: paramSchema.enum,
          extra: [],
        })
        results.summary.enumValuesMissing += paramSchema.enum.length
        continue
      }

      const implEnumData = schemaEnums[schemaVarName]
      if (!implEnumData) {
        // Schema variable found but not an enum
        results.missingEnumValues.push({
          endpoint: specEndpoint,
          param: paramName,
          file: implData.file,
          operationId: specParams.operationId,
          specEnum: paramSchema.enum,
          implEnum: null,
          missing: paramSchema.enum,
          extra: [],
        })
        results.summary.enumValuesMissing += paramSchema.enum.length
        continue
      }

      // Compare enum values
      const specEnumValues = paramSchema.enum
      const implEnumValues = implEnumData.values

      const missing = specEnumValues.filter(v => !implEnumValues.includes(v))
      const extra = implEnumValues.filter(v => !specEnumValues.includes(v))

      if (missing.length > 0) {
        results.missingEnumValues.push({
          endpoint: specEndpoint,
          param: paramName,
          file: implData.file,
          operationId: specParams.operationId,
          schemaName: schemaVarName,
          schemaFile: implEnumData.file,
          specEnum: specEnumValues,
          implEnum: implEnumValues,
          missing,
          extra: [],
        })
        results.summary.enumValuesMissing += missing.length
      }

      if (extra.length > 0) {
        results.extraEnumValues.push({
          endpoint: specEndpoint,
          param: paramName,
          file: implData.file,
          operationId: specParams.operationId,
          schemaName: schemaVarName,
          schemaFile: implEnumData.file,
          specEnum: specEnumValues,
          implEnum: implEnumValues,
          missing: [],
          extra,
        })
        results.summary.enumValuesExtra += extra.length
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
  const { missingEndpoints, extraEndpoints, missingRequiredParams, missingOptionalParams, extraParams, deprecatedEndpoints, deprecatedParameters, missingEnumValues, extraEnumValues, summary } = results

  console.log('\n' + '='.repeat(60))
  console.log('API SYNC CHECK RESULTS')
  console.log('='.repeat(60))

  console.log(`\nEndpoint Coverage: ${summary.endpointsCovered}/${summary.totalSpecEndpoints} spec endpoints implemented`)

  // Deprecated endpoints (IMPORTANT - show first)
  if (deprecatedEndpoints.length > 0) {
    console.log(`\n🔶 DEPRECATED Endpoints Still Implemented (${deprecatedEndpoints.length}):`)
    console.log('   These endpoints are marked as deprecated and should be migrated.\n')
    for (const { endpoint, file, message, replacementEndpoint, replacementUrl } of deprecatedEndpoints) {
      console.log(`   ${endpoint} (${file})`)
      if (message) {
        console.log(`      ⚠️  ${message}`)
      }
      if (replacementEndpoint) {
        console.log(`      → Migrate to: ${replacementEndpoint}`)
      }
      if (replacementUrl) {
        console.log(`      📖 Docs: ${replacementUrl}`)
      }
      console.log('')
    }
  }

  // Deprecated parameters
  if (deprecatedParameters.length > 0) {
    console.log(`\n🔶 DEPRECATED Parameters Still In Use (${deprecatedParameters.length}):`)
    const byFile = groupBy(deprecatedParameters, 'file')
    for (const [file, params] of Object.entries(byFile)) {
      console.log(`\n   ${file}:`)
      for (const p of params) {
        console.log(`      ${p.endpoint}`)
        console.log(`         Parameter: ${p.param}`)
        if (p.message) {
          console.log(`         ⚠️  ${p.message}`)
        }
      }
    }
    console.log('')
  }

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

  // Missing enum values (in spec but not in MCP schema)
  if (missingEnumValues.length > 0) {
    console.log(`\n🔴 CRITICAL: Missing Enum Values (${summary.enumValuesMissing} values):`)
    const byFile = groupBy(missingEnumValues, 'file')
    for (const [file, items] of Object.entries(byFile)) {
      console.log(`\n   ${file}:`)
      for (const item of items) {
        console.log(`      ${item.endpoint}`)
        console.log(`         Parameter: ${item.param}`)
        if (item.schemaName && item.schemaFile) {
          console.log(`         Schema: ${item.schemaName} (${item.schemaFile})`)
        }
        console.log(`         Missing values: ${item.missing.join(', ')}`)
        if (item.implEnum) {
          console.log(`         Current values: ${item.implEnum.join(', ')}`)
        } else {
          console.log(`         Current: No enum constraint (just z.string())`)
        }
      }
    }
  } else {
    console.log('\n✅ All enum values from spec are implemented')
  }

  // Extra enum values (in MCP schema but not in spec)
  if (extraEnumValues.length > 0) {
    console.log(`\n⚠️  Extra Enum Values (${summary.enumValuesExtra} values) - not in spec:`)
    const byFile = groupBy(extraEnumValues, 'file')
    for (const [file, items] of Object.entries(byFile)) {
      console.log(`\n   ${file}:`)
      for (const item of items) {
        console.log(`      ${item.endpoint}`)
        console.log(`         Parameter: ${item.param}`)
        if (item.schemaName && item.schemaFile) {
          console.log(`         Schema: ${item.schemaName} (${item.schemaFile})`)
        }
        console.log(`         Extra values: ${item.extra.join(', ')}`)
        console.log(`         Expected values: ${item.specEnum.join(', ')}`)
      }
    }
  } else {
    console.log('\n✅ No extra enum values found')
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Endpoints in spec:         ${summary.totalSpecEndpoints}`)
  console.log(`Endpoints implemented:     ${summary.endpointsCovered}`)
  console.log(`Missing endpoints:         ${missingEndpoints.length}`)
  console.log(`Extra endpoints:           ${extraEndpoints.length}`)
  console.log(`Deprecated endpoints:      ${summary.deprecatedEndpointsInUse}`)
  console.log(`Deprecated parameters:     ${summary.deprecatedParametersInUse}`)
  console.log(`Missing required params:   ${summary.requiredParamsMissing}`)
  console.log(`Missing optional params:   ${summary.optionalParamsMissing}`)
  console.log(`Extra params:              ${summary.extraParams}`)
  console.log(`Missing enum values:       ${summary.enumValuesMissing}`)
  console.log(`Extra enum values:         ${summary.enumValuesExtra}`)

  const hasIssues = missingEndpoints.length > 0 ||
    missingRequiredParams.length > 0 ||
    missingOptionalParams.length > 0 ||
    extraParams.length > 0 ||
    deprecatedEndpoints.length > 0 ||
    deprecatedParameters.length > 0 ||
    missingEnumValues.length > 0 ||
    extraEnumValues.length > 0

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

  // Create issues for deprecated endpoints still implemented
  for (const { endpoint, file, operationId, message, replacementEndpoint, replacementUrl } of results.deprecatedEndpoints) {
    const category = getEndpointCategory(endpoint)
    const docLink = buildDocLink(operationId)
    const issueId = generateIssueId('deprecated-endpoint', endpoint)

    let body = `${issueId}\n\n## ⚠️ Deprecated Endpoint Still Implemented\n\n` +
      `This endpoint is marked as deprecated in the API spec and should be migrated to prevent breaking changes.\n\n` +
      `### Details\n\n` +
      `- **Endpoint:** \`${endpoint}\`\n` +
      `- **File:** \`src/tools/${file}\`\n` +
      (docLink ? `- **API Docs:** [View Documentation](${docLink})\n` : '')

    if (message) {
      body += `\n### Deprecation Notice\n\n${message}\n`
    }

    if (replacementEndpoint) {
      body += `\n### Migration Path\n\nReplace calls to \`${endpoint}\` with \`${replacementEndpoint}\`\n`
    }

    if (replacementUrl) {
      body += `\n### Replacement Documentation\n\n[View New Endpoint](${replacementUrl})\n`
    }

    body += `\n### Action Required\n\n` +
      `1. Review the new endpoint documentation\n` +
      `2. Update the tool implementation to use the new endpoint\n` +
      `3. Test the changes to ensure functionality is preserved\n` +
      `4. Remove the old deprecated endpoint usage\n\n` +
      `---\n*Auto-generated by API sync checker*`

    issues.push({
      id: issueId,
      title: `Migrate deprecated endpoint: ${endpoint}`,
      body,
      labels: ['api-sync', 'deprecated', 'breaking-change', category],
    })
  }

  // Create issues for deprecated parameters still in use
  const deprecatedParamsByFile = groupBy(results.deprecatedParameters, 'file')
  for (const [file, params] of Object.entries(deprecatedParamsByFile)) {
    const issueId = generateIssueId('deprecated-params', file)
    const paramCount = params.length

    let body = `${issueId}\n\n## ⚠️ Deprecated Parameters Still In Use\n\n` +
      `The following parameters in \`src/tools/${file}\` are marked as deprecated.\n` +
      `These should be removed or replaced to prevent breaking changes.\n\n`

    const byEndpoint = groupBy(params, 'endpoint')
    for (const [endpoint, eps] of Object.entries(byEndpoint)) {
      const docLink = buildDocLink(eps[0]?.operationId)
      body += `### \`${endpoint}\`\n\n`
      if (docLink) {
        body += `[View API Docs](${docLink})\n\n`
      }
      for (const p of eps) {
        body += `- \`${p.param}\``
        if (p.message) {
          body += ` - ${p.message}`
        }
        body += '\n'
      }
      body += '\n'
    }

    body += `### Action Required\n\n` +
      `1. Review the API documentation for these parameters\n` +
      `2. Remove or replace deprecated parameters\n` +
      `3. Test the changes to ensure functionality\n\n` +
      `---\n*Auto-generated by API sync checker*`

    const toolName = file.replace('.ts', '')
    issues.push({
      id: issueId,
      title: `Remove ${paramCount} deprecated parameter${paramCount > 1 ? 's' : ''} from ${toolName} tool`,
      body,
      labels: ['api-sync', 'deprecated', 'breaking-change', toolName],
    })
  }

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

    // Log schema extraction stats for verification
    let schemasExtracted = 0
    let enumsFound = 0
    let constraintsFound = 0
    for (const endpoint of Object.values(specEndpoints)) {
      const schemas = endpoint.schemas || {}
      schemasExtracted += Object.keys(schemas).length
      for (const schema of Object.values(schemas)) {
        if (schema.enum) enumsFound++
        if (schema.minimum !== undefined || schema.maximum !== undefined) constraintsFound++
      }
    }
    console.log(`Extracted ${schemasExtracted} parameter schemas (${enumsFound} with enums, ${constraintsFound} with constraints)`)

    console.log('Extracting implemented endpoints and parameters...')
    const implEndpoints = extractImplementedEndpointsWithParams()
    console.log(`Found ${Object.keys(implEndpoints).length} implemented endpoints`)

    console.log('Extracting enum schemas from MCP implementation...')
    const schemaEnums = extractSchemaEnums()
    console.log(`Found ${Object.keys(schemaEnums).length} enum schemas`)

    console.log('Comparing...')
    const results = compareAll(specEndpoints, implEndpoints, schemaEnums)

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
