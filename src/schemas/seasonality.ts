import { z } from "zod"

/** Seasonality performers order by column */
export const seasonalityOrderBySchema = z.enum([
  "month", "positive_closes", "years", "positive_months_perc",
  "median_change", "avg_change", "max_change", "min_change",
]).describe("Column to order seasonality results by")

/** Minimum years of data required for seasonality performers */
export const minYearsSchema = z.number().int().min(1).describe("Minimum years of data required").default(10)

/** Filter for S&P 500 or Nasdaq 100 only */
export const sP500NasdaqOnlySchema = z.boolean().describe("Only return tickers in S&P 500 or Nasdaq 100").default(false)

/** Maximum number of results for seasonality performers */
export const seasonalityLimitSchema = z.number().int("Limit must be an integer").min(1).describe("Maximum number of results").default(50)

/** Order direction for seasonality performers */
export const seasonalityOrderDirectionSchema = z.enum(["asc", "desc"]).describe("Order direction").default("desc")
