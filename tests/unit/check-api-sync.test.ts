import { describe, it, expect } from 'vitest'

// Mock functions to test (we'll need to export them from check-api-sync.js)
// For now, we'll test the logic inline

describe('resolveRef', () => {
  // Helper function to mimic resolveRef
  function resolveRef(ref, spec, visited = new Set()) {
    if (!ref || typeof ref !== 'string') return null

    if (visited.has(ref)) {
      return null
    }
    visited.add(ref)

    if (!ref.startsWith('#/')) {
      return null
    }

    const refPath = ref.substring(2)
    const standardMatch = refPath.match(/^(components\/schemas|components\/parameters|components\/responses)\/(.+)$/)

    let path
    if (standardMatch) {
      const prefix = standardMatch[1].split('/')
      const schemaName = standardMatch[2]
      path = [...prefix, schemaName]
    } else {
      path = refPath.split('/')
    }

    let current = spec
    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment]
      } else {
        return null
      }
    }

    if (current && typeof current === 'object' && current.$ref) {
      return resolveRef(current.$ref, spec, visited)
    }

    return current
  }

  it('resolves a simple schema reference', () => {
    const spec = {
      components: {
        schemas: {
          'Tide Type': {
            description: 'Filter results by tide type',
            enum: ['all', 'equity_only', 'etf_only', 'index_only'],
            type: 'string'
          }
        }
      }
    }

    const result = resolveRef('#/components/schemas/Tide Type', spec)

    expect(result).toBeDefined()
    expect(result.enum).toEqual(['all', 'equity_only', 'etf_only', 'index_only'])
    expect(result.type).toBe('string')
  })

  it('resolves nested references', () => {
    const spec = {
      components: {
        schemas: {
          'Inner': {
            type: 'string',
            enum: ['a', 'b', 'c']
          },
          'Outer': {
            $ref: '#/components/schemas/Inner'
          }
        }
      }
    }

    const result = resolveRef('#/components/schemas/Outer', spec)

    expect(result).toBeDefined()
    expect(result.enum).toEqual(['a', 'b', 'c'])
  })

  it('returns null for invalid reference', () => {
    const spec = {
      components: {
        schemas: {}
      }
    }

    const result = resolveRef('#/components/schemas/NonExistent', spec)

    expect(result).toBeNull()
  })

  it('handles circular references', () => {
    const spec = {
      components: {
        schemas: {
          'A': {
            $ref: '#/components/schemas/B'
          },
          'B': {
            $ref: '#/components/schemas/A'
          }
        }
      }
    }

    const result = resolveRef('#/components/schemas/A', spec)

    // Should return null to prevent infinite loop
    expect(result).toBeNull()
  })

  it('returns null for external references', () => {
    const spec = {}
    const result = resolveRef('http://example.com/schema', spec)

    expect(result).toBeNull()
  })

  it('returns null for null or undefined input', () => {
    const spec = {}

    expect(resolveRef(null, spec)).toBeNull()
    expect(resolveRef(undefined, spec)).toBeNull()
  })

  it('resolves schema names with slashes', () => {
    const spec = {
      components: {
        schemas: {
          'S&P 500/Nasdaq Only': {
            type: 'boolean',
            default: false,
            description: 'Only return tickers in S&P 500 or Nasdaq 100'
          }
        }
      }
    }

    const result = resolveRef('#/components/schemas/S&P 500/Nasdaq Only', spec)

    expect(result).toBeDefined()
    expect(result.type).toBe('boolean')
    expect(result.default).toBe(false)
  })
})

describe('extractParamSchema', () => {
  function resolveRef(ref, spec, visited = new Set()) {
    if (!ref || typeof ref !== 'string') return null
    if (visited.has(ref)) return null
    visited.add(ref)
    if (!ref.startsWith('#/')) return null

    const refPath = ref.substring(2)
    const standardMatch = refPath.match(/^(components\/schemas|components\/parameters|components\/responses)\/(.+)$/)

    let path
    if (standardMatch) {
      const prefix = standardMatch[1].split('/')
      const schemaName = standardMatch[2]
      path = [...prefix, schemaName]
    } else {
      path = refPath.split('/')
    }

    let current = spec
    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment]
      } else {
        return null
      }
    }

    if (current && typeof current === 'object' && current.$ref) {
      return resolveRef(current.$ref, spec, visited)
    }

    return current
  }

  function extractParamSchema(param, spec) {
    const schema = {}

    let paramSchema = param.schema
    if (paramSchema?.$ref) {
      paramSchema = resolveRef(paramSchema.$ref, spec)
    }

    if (!paramSchema) return schema

    if (paramSchema.enum) {
      schema.enum = paramSchema.enum
    }

    if (paramSchema.type) {
      schema.type = paramSchema.type
    }

    if (paramSchema.minimum !== undefined) {
      schema.minimum = paramSchema.minimum
    }
    if (paramSchema.maximum !== undefined) {
      schema.maximum = paramSchema.maximum
    }

    if (paramSchema.pattern) {
      schema.pattern = paramSchema.pattern
    }
    if (paramSchema.format) {
      schema.format = paramSchema.format
    }

    if (paramSchema.default !== undefined) {
      schema.default = paramSchema.default
    }

    return schema
  }

  it('extracts enum values from inline schema', () => {
    const param = {
      name: 'tide_type',
      schema: {
        type: 'string',
        enum: ['all', 'equity_only', 'etf_only']
      }
    }
    const spec = {}

    const result = extractParamSchema(param, spec)

    expect(result.enum).toEqual(['all', 'equity_only', 'etf_only'])
    expect(result.type).toBe('string')
  })

  it('extracts enum values from $ref schema', () => {
    const param = {
      name: 'tide_type',
      schema: {
        $ref: '#/components/schemas/Tide Type'
      }
    }
    const spec = {
      components: {
        schemas: {
          'Tide Type': {
            type: 'string',
            enum: ['all', 'equity_only', 'etf_only', 'index_only']
          }
        }
      }
    }

    const result = extractParamSchema(param, spec)

    expect(result.enum).toEqual(['all', 'equity_only', 'etf_only', 'index_only'])
    expect(result.type).toBe('string')
  })

  it('extracts numeric constraints', () => {
    const param = {
      name: 'limit',
      schema: {
        $ref: '#/components/schemas/Limit'
      }
    }
    const spec = {
      components: {
        schemas: {
          'Limit': {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            default: 50
          }
        }
      }
    }

    const result = extractParamSchema(param, spec)

    expect(result.type).toBe('integer')
    expect(result.minimum).toBe(1)
    expect(result.maximum).toBe(500)
    expect(result.default).toBe(50)
  })

  it('extracts string constraints', () => {
    const param = {
      name: 'email',
      schema: {
        type: 'string',
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
        format: 'email'
      }
    }
    const spec = {}

    const result = extractParamSchema(param, spec)

    expect(result.type).toBe('string')
    expect(result.pattern).toBe('^[a-z]+@[a-z]+\\.[a-z]+$')
    expect(result.format).toBe('email')
  })

  it('returns empty object for param without schema', () => {
    const param = {
      name: 'test'
    }
    const spec = {}

    const result = extractParamSchema(param, spec)

    expect(result).toEqual({})
  })
})

describe('extractDeprecationInfo', () => {
  function extractDeprecationInfo(description) {
    if (!description) return null

    const lowerDesc = description.toLowerCase()
    if (!lowerDesc.includes('deprecated')) return null

    const info = {
      deprecated: true,
      message: '',
      replacementEndpoint: null
    }

    const lines = description.trim().split('\n')
    info.message = lines[0].trim()

    const urlMatch = description.match(/https:\/\/api\.unusualwhales\.com\/docs#\/operations\/([^\s\)\]]+)/)
    if (urlMatch) {
      info.replacementUrl = urlMatch[0]
    }

    const pathMatch = description.match(/\/api\/[^\s\)]+/)
    if (pathMatch) {
      info.replacementEndpoint = pathMatch[0]
    }

    return info
  }

  it('detects deprecated endpoint with replacement URL', () => {
    const description = `This endpoint has been deprecated and will be removed.
Please migrate to this Flow Alerts endpoint, which provides a more detailed response: [https://api.unusualwhales.com/docs#/operations/PublicApi.OptionTradeController.flow_alerts](https://api.unusualwhales.com/docs#/operations/PublicApi.OptionTradeController.flow_alerts)`

    const result = extractDeprecationInfo(description)

    expect(result).toBeDefined()
    expect(result.deprecated).toBe(true)
    expect(result.message).toBe('This endpoint has been deprecated and will be removed.')
    expect(result.replacementUrl).toBe('https://api.unusualwhales.com/docs#/operations/PublicApi.OptionTradeController.flow_alerts')
  })

  it('detects deprecated endpoint with replacement endpoint path', () => {
    const description = `This endpoint has been deprecated and will be removed, please migrate to the new [endpoint](https://api.unusualwhales.com/docs#/operations/PublicApi.TickerController.spot_exposures_by_strike_expiry_v2)`

    const result = extractDeprecationInfo(description)

    expect(result).toBeDefined()
    expect(result.deprecated).toBe(true)
    expect(result.message).toContain('deprecated')
    expect(result.replacementUrl).toBe('https://api.unusualwhales.com/docs#/operations/PublicApi.TickerController.spot_exposures_by_strike_expiry_v2')
  })

  it('detects deprecated with API path in description', () => {
    const description = `This endpoint is deprecated. Use /api/v2/new-endpoint instead.`

    const result = extractDeprecationInfo(description)

    expect(result).toBeDefined()
    expect(result.deprecated).toBe(true)
    expect(result.replacementEndpoint).toBe('/api/v2/new-endpoint')
  })

  it('returns null for non-deprecated endpoint', () => {
    const description = 'This is a regular endpoint description'

    const result = extractDeprecationInfo(description)

    expect(result).toBeNull()
  })

  it('returns null for empty description', () => {
    expect(extractDeprecationInfo('')).toBeNull()
    expect(extractDeprecationInfo(null)).toBeNull()
    expect(extractDeprecationInfo(undefined)).toBeNull()
  })

  it('handles case-insensitive deprecated detection', () => {
    const description = 'DEPRECATED: This endpoint is no longer supported'

    const result = extractDeprecationInfo(description)

    expect(result).toBeDefined()
    expect(result.deprecated).toBe(true)
    expect(result.message).toBe('DEPRECATED: This endpoint is no longer supported')
  })
})

describe('extractSchemaEnums', () => {
  it('extracts enum values from schema files', () => {
    // Mock schema content
    const schemaContent = `
      import { z } from "zod"

      export const optionTypeSchema = z.enum(["call", "put"]).describe("Option type (call or put)")

      export const orderSchema = z.enum(["asc", "desc"]).describe("Order direction")

      export const candleSizeSchema = z.enum([
        "1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d",
      ]).describe("Candle size")
    `

    // Parse the content
    const enums: Record<string, { file: string; values: string[] }> = {}

    const enumPattern = /(?:export\s+)?const\s+(\w+Schema)\s*=\s*z\.enum\(\s*\[([^\]]+)\]\s*\)/g
    let match

    while ((match = enumPattern.exec(schemaContent)) !== null) {
      const schemaName = match[1]
      const enumValues = match[2]

      const values: string[] = []
      const valuePattern = /["']([^"']+)["']/g
      let valueMatch

      while ((valueMatch = valuePattern.exec(enumValues)) !== null) {
        values.push(valueMatch[1])
      }

      if (values.length > 0) {
        enums[schemaName] = {
          file: 'common.ts',
          values,
        }
      }
    }

    expect(enums['optionTypeSchema']).toBeDefined()
    expect(enums['optionTypeSchema'].values).toEqual(['call', 'put'])

    expect(enums['orderSchema']).toBeDefined()
    expect(enums['orderSchema'].values).toEqual(['asc', 'desc'])

    expect(enums['candleSizeSchema']).toBeDefined()
    expect(enums['candleSizeSchema'].values).toEqual([
      '1m', '5m', '10m', '15m', '30m', '1h', '4h', '1d',
    ])
  })

  it('handles enums without export keyword', () => {
    const schemaContent = `
      const privateSchema = z.enum(["a", "b", "c"])
    `

    const enums: Record<string, { file: string; values: string[] }> = {}
    const enumPattern = /(?:export\s+)?const\s+(\w+Schema)\s*=\s*z\.enum\(\s*\[([^\]]+)\]\s*\)/g
    let match

    while ((match = enumPattern.exec(schemaContent)) !== null) {
      const schemaName = match[1]
      const enumValues = match[2]

      const values: string[] = []
      const valuePattern = /["']([^"']+)["']/g
      let valueMatch

      while ((valueMatch = valuePattern.exec(enumValues)) !== null) {
        values.push(valueMatch[1])
      }

      if (values.length > 0) {
        enums[schemaName] = {
          file: 'test.ts',
          values,
        }
      }
    }

    expect(enums['privateSchema']).toBeDefined()
    expect(enums['privateSchema'].values).toEqual(['a', 'b', 'c'])
  })
})

describe('findSchemaForParam', () => {
  it('finds schema by matching parameter name pattern', () => {
    const toolContent = `
      export const schema = z.object({
        tide_type: tideTypeSchema.optional(),
        option_type: optionTypeSchema,
      })
    `

    // Simulate findSchemaForParam logic
    function findSchemaForParam(paramName: string, content: string): string | null {
      const pattern = new RegExp(`${paramName}\\s*:\\s*(\\w+Schema)`, 'i')
      const match = content.match(pattern)

      if (match) {
        return match[1]
      }

      return null
    }

    const tideTypeResult = findSchemaForParam('tide_type', toolContent)
    expect(tideTypeResult).toBe('tideTypeSchema')

    const optionTypeResult = findSchemaForParam('option_type', toolContent)
    expect(optionTypeResult).toBe('optionTypeSchema')
  })

  it('returns null for non-existent parameter', () => {
    const toolContent = `
      export const schema = z.object({
        tide_type: tideTypeSchema.optional(),
      })
    `

    function findSchemaForParam(paramName: string, content: string): string | null {
      const pattern = new RegExp(`${paramName}\\s*:\\s*(\\w+Schema)`, 'i')
      const match = content.match(pattern)
      return match ? match[1] : null
    }

    const result = findSchemaForParam('nonexistent', toolContent)
    expect(result).toBeNull()
  })
})

describe('enum validation', () => {
  it('detects missing enum values', () => {
    // Spec has enum with 4 values
    const specEnum = ['all', 'equity_only', 'etf_only', 'index_only']

    // Implementation only has 3 values
    const implEnum = ['all', 'equity_only', 'etf_only']

    const missing = specEnum.filter(v => !implEnum.includes(v))
    const extra = implEnum.filter(v => !specEnum.includes(v))

    expect(missing).toEqual(['index_only'])
    expect(extra).toEqual([])
  })

  it('detects extra enum values', () => {
    // Spec has enum with 2 values
    const specEnum = ['call', 'put']

    // Implementation has 3 values (including deprecated one)
    const implEnum = ['call', 'put', 'spread']

    const missing = specEnum.filter(v => !implEnum.includes(v))
    const extra = implEnum.filter(v => !specEnum.includes(v))

    expect(missing).toEqual([])
    expect(extra).toEqual(['spread'])
  })

  it('detects both missing and extra enum values', () => {
    // Spec has enum values
    const specEnum = ['asc', 'desc', 'random']

    // Implementation has different values
    const implEnum = ['asc', 'ascending', 'descending']

    const missing = specEnum.filter(v => !implEnum.includes(v))
    const extra = implEnum.filter(v => !specEnum.includes(v))

    expect(missing).toEqual(['desc', 'random'])
    expect(extra).toEqual(['ascending', 'descending'])
  })

  it('passes when enum values match exactly', () => {
    const specEnum = ['call', 'put']
    const implEnum = ['call', 'put']

    const missing = specEnum.filter(v => !implEnum.includes(v))
    const extra = implEnum.filter(v => !specEnum.includes(v))

    expect(missing).toEqual([])
    expect(extra).toEqual([])
  })

  it('handles enums with different ordering', () => {
    const specEnum = ['z', 'a', 'm']
    const implEnum = ['a', 'm', 'z']

    const missing = specEnum.filter(v => !implEnum.includes(v))
    const extra = implEnum.filter(v => !specEnum.includes(v))

    expect(missing).toEqual([])
    expect(extra).toEqual([])
  })
})
