import { z } from "zod"

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Convert a Zod schema to JSON Schema format for MCP tool definitions.
 * Uses Zod v4's native toJSONSchema method.
 * Strips the $schema property and ensures proper typing.
 */
export function toJsonSchema<T extends z.core.$ZodType>(schema: T): {
  type: "object"
  properties: Record<string, unknown>
  required: string[]
} {
  const jsonSchema = z.toJSONSchema(schema)
  // Remove $schema property and return with proper typing
  const { $schema: _, ...rest } = jsonSchema as Record<string, unknown>
  return rest as {
    type: "object"
    properties: Record<string, unknown>
    required: string[]
  }
}

/**
 * Format Zod validation errors into a readable string.
 */
export function formatZodError<T>(error: z.ZodError<T>): string {
  return error.issues.map((issue) => issue.message).join(", ")
}

// ============================================================================
// Re-exports
// ============================================================================

// Common schemas
export {
  dateRegex,
  tickerSchema,
  dateSchema,
  expirySchema,
  limitSchema,
  optionTypeSchema,
  sideSchema,
  orderDirectionSchema,
  pageSchema,
  candleSizeSchema,
  timeframeSchema,
  timespanSchema,
  deltaSchema,
} from "./common.js"

// Flow schemas
export {
  flowGroupSchema,
  flowOutputSchema,
} from "./flow.js"

// Stock schemas
export {
  filterSchema,
} from "./stock.js"

// Screener schemas
export {
  stockScreenerOrderBySchema,
  optionContractScreenerOrderBySchema,
} from "./screener.js"

// Seasonality schemas
export {
  seasonalityOrderBySchema,
  minYearsSchema,
  sP500NasdaqOnlySchema,
  seasonalityLimitSchema,
  seasonalityOrderDirectionSchema,
} from "./seasonality.js"

// Institutions schemas
export {
  institutionalActivityOrderBySchema,
  institutionalHoldingsOrderBySchema,
  institutionalListOrderBySchema,
  institutionalOwnershipOrderBySchema,
  latestInstitutionalFilingsOrderBySchema,
} from "./institutions.js"
