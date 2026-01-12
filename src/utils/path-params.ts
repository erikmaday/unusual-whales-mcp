/**
 * Path parameter builder with validation and encoding
 *
 * Provides a fluent API for building URL paths with validated and encoded parameters
 *
 * @example
 * ```typescript
 * const path = new PathParamBuilder()
 *   .add('ticker', ticker)
 *   .add('expiry', expiry)
 *   .build('/api/stock/{ticker}/greek-flow/{expiry}')
 * // Result: "/api/stock/AAPL/greek-flow/2024-01-19"
 * ```
 */
export class PathParamBuilder {
  private params: Map<string, string> = new Map()

  /**
   * Add a parameter to the builder
   *
   * @param name - Parameter name (must match placeholder in template)
   * @param value - Parameter value (will be validated and encoded)
   * @param required - Whether this parameter is required (default: true)
   * @returns This builder for chaining
   * @throws {Error} If required parameter is missing or value is invalid
   */
  add(name: string, value: unknown, required: boolean = true): this {
    // Check if parameter is provided
    if (value === undefined || value === null) {
      if (required) {
        throw new Error(`${name} is required`)
      }
      return this
    }

    // Convert to string
    const str = String(value)

    // Validate: no path traversal attempts
    if (str.includes("/") || str.includes("\\") || str.includes("..")) {
      throw new Error(`Invalid ${name}: contains path characters`)
    }

    // Validate: not empty
    if (str.length === 0) {
      throw new Error(`${name} cannot be empty`)
    }

    // Store encoded value
    this.params.set(name, encodeURIComponent(str))

    return this
  }

  /**
   * Build the final path by replacing placeholders with parameter values
   *
   * @param template - Path template with {placeholder} syntax
   * @returns Final path with all placeholders replaced
   * @throws {Error} If template contains placeholders for missing required parameters
   *
   * @example
   * ```typescript
   * builder.build('/api/stock/{ticker}/info')
   * // Result: "/api/stock/AAPL/info"
   * ```
   */
  build(template: string): string {
    let path = template

    // Replace all placeholders
    const placeholderRegex = /\{([^}]+)\}/g
    const matches = template.match(placeholderRegex)

    if (matches) {
      for (const match of matches) {
        const paramName = match.slice(1, -1) // Remove { and }
        const value = this.params.get(paramName)

        if (value === undefined) {
          throw new Error(`Missing required parameter: ${paramName}`)
        }

        path = path.replace(match, value)
      }
    }

    return path
  }

  /**
   * Clear all parameters
   *
   * @returns This builder for reuse
   */
  clear(): this {
    this.params.clear()
    return this
  }
}

/**
 * Encode a path parameter with validation
 *
 * This is a standalone function for backwards compatibility
 * Consider using PathParamBuilder for more complex path construction
 *
 * @param value - Value to encode
 * @returns Encoded string safe for URL path
 * @throws {Error} If value is invalid
 */
export function encodePath(value: unknown): string {
  if (value === undefined || value === null) {
    throw new Error("Path parameter is required")
  }

  const str = String(value)

  if (str.includes("/") || str.includes("\\") || str.includes("..")) {
    throw new Error("Invalid path parameter")
  }

  return encodeURIComponent(str)
}
