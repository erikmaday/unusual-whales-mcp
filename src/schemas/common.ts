import { z } from "zod"

/** Date regex pattern for YYYY-MM-DD format */
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/

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
  .max(500, "Limit cannot exceed 500")
  .describe("Maximum number of results")

/** Option strike price */
export const strikeSchema = z.number()
  .positive("Strike price must be positive")
  .describe("Option strike price")

/** Option type (call, put, or ALL) */
export const optionTypeSchema = z.enum(["call", "put", "Call", "Put", "ALL"]).describe("Option type (call, put, or ALL)")

/** Trade side (ALL, ASK, BID, MID) */
export const sideSchema = z.enum(["ALL", "ASK", "BID", "MID"]).describe("Trade side (ALL, ASK, BID, or MID)")

/** Order direction */
export const orderDirectionSchema = z.enum(["asc", "desc"]).describe("Order direction").default("desc")

/** Pagination page number */
export const pageSchema = z.number()
  .int("Page must be an integer")
  .positive("Page must be positive")
  .describe("Page number for paginated results")

/** Candle size for OHLC data */
export const candleSizeSchema = z.enum([
  "1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d",
]).describe("Candle size (1m, 5m, 10m, 15m, 30m, 1h, 4h, 1d)")

/** Timeframe for historical data */
export const timeframeSchema = z.string().describe("Timeframe for historical data (e.g., '1y', '6m', '3m', '1m' for 1 year, 6 months, 3 months, 1 month)").default("1Y")

/** IV rank timespan */
export const timespanSchema = z.string().describe("Timespan for IV rank calculation (e.g., '1y' for 1-year lookback period)")

/** Delta value for risk reversal skew (10 or 25) */
export const deltaSchema = z.enum(["10", "25"]).describe("Delta value for risk reversal skew (10 or 25, representing 0.10 or 0.25)")
