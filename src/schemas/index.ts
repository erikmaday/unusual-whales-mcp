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
  strikeSchema,
  optionTypeSchema,
  orderSchema,
  pageSchema,
  candleSizeSchema,
  timeframeSchema,
  timespanSchema,
  deltaSchema,
} from "./common.js"

// Filter schemas
export {
  premiumFilterSchema,
  sizeFilterSchema,
  volumeFilterSchema,
  oiFilterSchema,
  dteFilterSchema,
} from "./filters.js"

// Flow schemas
export {
  flowTradeFiltersSchema,
  flowAlertsExtendedFiltersSchema,
  netFlowExpiryFiltersSchema,
  flowGroupSchema,
  flowOutputSchema,
} from "./flow.js"

// Stock schemas
export {
  optionContractFiltersSchema,
  stockFlowFiltersSchema,
  stockOutputSchema,
} from "./stock.js"

// Screener schemas
export {
  stockScreenerFiltersSchema,
  optionContractScreenerFiltersSchema,
} from "./screener.js"

// Insider schemas
export {
  insiderTransactionFiltersSchema,
} from "./insider.js"

// Seasonality schemas
export {
  seasonalityOrderBySchema,
} from "./seasonality.js"
