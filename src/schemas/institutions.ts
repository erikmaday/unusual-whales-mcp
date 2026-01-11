import { z } from "zod"

/**
 * Order by field options for institutional activity endpoint.
 * Used in /api/institution/{name}/activity
 */
export const institutionalActivityOrderBySchema = z.enum([
  "ticker",
  "security_type",
  "units",
  "units_change",
]).describe("Order by field for institutional activity")

/**
 * Order by field options for institutional holdings endpoint.
 * Used in /api/institution/{name}/holdings
 */
export const institutionalHoldingsOrderBySchema = z.enum([
  "date",
  "ticker",
  "security_type",
  "put_call",
  "first_buy",
  "price_first_buy",
  "units",
  "units_change",
  "historical_units",
  "value",
  "avg_price",
  "close",
  "shares_outstanding",
]).describe("Order by field for institutional holdings")

/**
 * Order by field options for institutional list endpoint.
 * Used in /api/institutions
 */
export const institutionalListOrderBySchema = z.enum([
  "name",
  "call_value",
  "put_value",
  "share_value",
  "call_holdings",
  "put_holdings",
  "share_holdings",
  "total_value",
  "warrant_value",
  "fund_value",
  "pfd_value",
  "debt_value",
  "total_holdings",
  "warrant_holdings",
  "fund_holdings",
  "pfd_holdings",
  "debt_holdings",
  "percent_of_total",
  "date",
  "buy_value",
  "sell_value",
]).describe("Order by field for institutional list")

/**
 * Order by field options for institutional ownership endpoint.
 * Used in /api/institution/{ticker}/ownership
 */
export const institutionalOwnershipOrderBySchema = z.enum([
  "name",
  "short_name",
  "filing_date",
  "first_buy",
  "units",
  "units_change",
  "units_changed",
  "value",
  "avg_price",
  "perc_outstanding",
  "perc_units_changed",
  "activity",
  "perc_inst_value",
  "perc_share_value",
]).describe("Order by field for institutional ownership")

/**
 * Order by field options for latest institutional filings endpoint.
 * Used in /api/institutions/latest_filings
 */
export const latestInstitutionalFilingsOrderBySchema = z.enum([
  "name",
  "short_name",
  "cik",
]).describe("Order by field for latest institutional filings")
