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
