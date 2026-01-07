import { z } from "zod"

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
// Shared field schemas - reusable across tools
// ============================================================================

/** Date regex pattern for YYYY-MM-DD format */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

/** Stock ticker symbol (e.g., AAPL, MSFT, TSLA) */
export const tickerSchema = z.string()
  .min(1, "Ticker symbol is required")
  .max(10, "Ticker symbol too long")
  .describe("Stock ticker symbol (e.g., AAPL, MSFT)")

/** Date in YYYY-MM-DD format */
export const dateSchema = z.string()
  .regex(dateRegex, "Date must be in YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format")

/** Option expiry date in YYYY-MM-DD format */
export const expirySchema = z.string()
  .regex(dateRegex, "Expiry date must be in YYYY-MM-DD format")
  .describe("Option expiry date in YYYY-MM-DD format")

/** Maximum number of results */
export const limitSchema = z.number()
  .int("Limit must be an integer")
  .positive("Limit must be positive")
  .describe("Maximum number of results")

/** Option strike price */
export const strikeSchema = z.number()
  .positive("Strike price must be positive")
  .describe("Option strike price")

/** Option type (call or put) */
export const optionTypeSchema = z.enum(["call", "put"]).describe("Option type (call or put)")

/** Order direction */
export const orderSchema = z.enum(["asc", "desc"]).describe("Order direction")

// ============================================================================
// Premium/Size/Volume filter schemas - for flow and darkpool tools
// ============================================================================

export const premiumFilterSchema = z.object({
  min_premium: z.number().nonnegative("Premium cannot be negative").describe("Minimum premium filter").optional(),
  max_premium: z.number().nonnegative("Premium cannot be negative").describe("Maximum premium filter").optional(),
})

export const sizeFilterSchema = z.object({
  min_size: z.number().int().nonnegative("Size cannot be negative").describe("Minimum size/volume filter").optional(),
  max_size: z.number().int().nonnegative("Size cannot be negative").describe("Maximum size/volume filter").optional(),
})

export const volumeFilterSchema = z.object({
  min_volume: z.number().int().nonnegative("Volume cannot be negative").describe("Minimum volume filter").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("Maximum volume filter").optional(),
})

export const oiFilterSchema = z.object({
  min_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("Minimum open interest filter").optional(),
  max_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("Maximum open interest filter").optional(),
})

export const dteFilterSchema = z.object({
  min_dte: z.number().int().nonnegative("DTE cannot be negative").describe("Minimum days to expiration").optional(),
  max_dte: z.number().int().nonnegative("DTE cannot be negative").describe("Maximum days to expiration").optional(),
})

// ============================================================================
// Flow-specific schemas
// ============================================================================

export const flowTradeFiltersSchema = z.object({
  is_floor: z.boolean().describe("Filter for floor trades").optional(),
  is_sweep: z.boolean().describe("Filter for sweep trades").optional(),
  is_multi_leg: z.boolean().describe("Filter for multi-leg trades").optional(),
  is_unusual: z.boolean().describe("Filter for unusual trades").optional(),
  is_golden_sweep: z.boolean().describe("Filter for golden sweep trades").optional(),
})

export const flowGroupSchema = z.enum([
  "airline", "bank", "basic materials", "china", "communication services",
  "consumer cyclical", "consumer defensive", "crypto", "cyber", "energy",
  "financial services", "gas", "gold", "healthcare", "industrials", "mag7",
  "oil", "real estate", "refiners", "reit", "semi", "silver", "technology",
  "uranium", "utilities",
]).describe("Flow group (e.g., mag7, semi, bank, energy, crypto)")

// ============================================================================
// Candle size schema
// ============================================================================

export const candleSizeSchema = z.enum([
  "1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d",
]).describe("Candle size (1m, 5m, 10m, 15m, 30m, 1h, 4h, 1d)")

// ============================================================================
// Timeframe schemas
// ============================================================================

export const timeframeSchema = z.string().describe("Timeframe for historical data")
