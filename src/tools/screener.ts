import { z } from "zod"
import { uwFetch, formatResponse, formatError } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  stockScreenerFiltersSchema,
  optionContractScreenerFiltersSchema,
  formatZodError,
} from "../schemas.js"

const screenerActions = ["stocks", "option_contracts", "analysts"] as const

// Base schema for common fields across all screener actions
const screenerBaseSchema = z.object({
  action: z.enum(screenerActions).describe("The action to perform"),
  ticker: tickerSchema.optional(),

  // Stock screener common filters
  min_marketcap: z.number().describe("Minimum market cap").optional(),
  max_marketcap: z.number().describe("Maximum market cap").optional(),
  min_volume: z.number().int().nonnegative().describe("Minimum volume").optional(),
  max_volume: z.number().int().nonnegative().describe("Maximum volume").optional(),

  // Option contract screener common filters
  is_otm: z.boolean().describe("Filter for OTM options").optional(),
  min_dte: z.number().int().nonnegative().describe("Minimum days to expiration").optional(),
  max_dte: z.number().int().nonnegative().describe("Maximum days to expiration").optional(),
  min_premium: z.number().nonnegative().describe("Minimum premium filter").optional(),
  max_premium: z.number().nonnegative().describe("Maximum premium filter").optional(),

  // Analyst screener filters
  recommendation: z.enum(["buy", "hold", "sell"]).describe("Analyst recommendation (buy, hold, sell)").optional(),
})

// Merge with stock screener and option contract screener filter schemas
const screenerInputSchema = screenerBaseSchema
  .merge(stockScreenerFiltersSchema)
  .merge(optionContractScreenerFiltersSchema)


export const screenerTool = {
  name: "uw_screener",
  description: `Access UnusualWhales screeners for stocks, options, and analysts.

Available actions:
- stocks: Screen stocks with various filters
- option_contracts: Screen option contracts with filters
- analysts: Screen analyst ratings`,
  inputSchema: toJsonSchema(screenerInputSchema),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle screener tool requests.
 *
 * @param args - Tool arguments containing action and optional screener filters
 * @returns JSON string with screener results or error message
 */
export async function handleScreener(args: Record<string, unknown>): Promise<string> {
  const parsed = screenerInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const data = parsed.data
  const { action } = data

  switch (action) {
    case "stocks":
      return formatResponse(await uwFetch("/api/screener/stocks", {
        // Stock screener filters
        min_marketcap: data.min_marketcap,
        max_marketcap: data.max_marketcap,
        min_volume: data.min_volume,
        max_volume: data.max_volume,
        // New stock screener filters
        "issue_types[]": data.issue_types,
        "sectors[]": data.sectors,
        min_change: data.min_change,
        max_change: data.max_change,
        min_underlying_price: data.min_underlying_price,
        max_underlying_price: data.max_underlying_price,
        is_s_p_500: data.is_s_p_500,
        has_dividends: data.has_dividends,
        // 3-day percentage filters
        min_perc_3_day_total: data.min_perc_3_day_total,
        max_perc_3_day_total: data.max_perc_3_day_total,
        min_perc_3_day_call: data.min_perc_3_day_call,
        max_perc_3_day_call: data.max_perc_3_day_call,
        min_perc_3_day_put: data.min_perc_3_day_put,
        max_perc_3_day_put: data.max_perc_3_day_put,
        // 30-day percentage filters
        min_perc_30_day_total: data.min_perc_30_day_total,
        max_perc_30_day_total: data.max_perc_30_day_total,
        min_perc_30_day_call: data.min_perc_30_day_call,
        max_perc_30_day_call: data.max_perc_30_day_call,
        min_perc_30_day_put: data.min_perc_30_day_put,
        max_perc_30_day_put: data.max_perc_30_day_put,
        // OI change percentage filters
        min_total_oi_change_perc: data.min_total_oi_change_perc,
        max_total_oi_change_perc: data.max_total_oi_change_perc,
        min_call_oi_change_perc: data.min_call_oi_change_perc,
        max_call_oi_change_perc: data.max_call_oi_change_perc,
        min_put_oi_change_perc: data.min_put_oi_change_perc,
        max_put_oi_change_perc: data.max_put_oi_change_perc,
        // Implied move filters
        min_implied_move: data.min_implied_move,
        max_implied_move: data.max_implied_move,
        min_implied_move_perc: data.min_implied_move_perc,
        max_implied_move_perc: data.max_implied_move_perc,
        // Volatility and IV rank filters
        min_volatility: data.min_volatility,
        max_volatility: data.max_volatility,
        min_iv_rank: data.min_iv_rank,
        max_iv_rank: data.max_iv_rank,
        // Call/put volume filters
        min_call_volume: data.min_call_volume,
        max_call_volume: data.max_call_volume,
        min_put_volume: data.min_put_volume,
        max_put_volume: data.max_put_volume,
        // Premium filters
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        min_call_premium: data.min_call_premium,
        max_call_premium: data.max_call_premium,
        min_put_premium: data.min_put_premium,
        max_put_premium: data.max_put_premium,
        // Net premium filters
        min_net_premium: data.min_net_premium,
        max_net_premium: data.max_net_premium,
        min_net_call_premium: data.min_net_call_premium,
        max_net_call_premium: data.max_net_call_premium,
        min_net_put_premium: data.min_net_put_premium,
        max_net_put_premium: data.max_net_put_premium,
        // OI filters
        min_oi_vs_vol: data.min_oi_vs_vol,
        max_oi_vs_vol: data.max_oi_vs_vol,
        // Put/call ratio filters
        min_put_call_ratio: data.min_put_call_ratio,
        max_put_call_ratio: data.max_put_call_ratio,
        // Stock volume vs avg filters
        min_stock_volume_vs_avg30_volume: data.min_stock_volume_vs_avg30_volume,
        max_avg30_volume: data.max_avg30_volume,
        // Date filter
        date: data.date,
      }))

    case "option_contracts":
      return formatResponse(await uwFetch("/api/screener/option-contracts", {
        // Basic option filters
        min_dte: data.min_dte,
        max_dte: data.max_dte,
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        is_otm: data.is_otm,
        // New option contract screener filters
        ticker_symbol: data.ticker_symbol,
        "sectors[]": data.sectors,
        min_underlying_price: data.min_underlying_price,
        max_underlying_price: data.max_underlying_price,
        exclude_ex_div_ticker: data.exclude_ex_div_ticker,
        min_diff: data.min_diff,
        max_diff: data.max_diff,
        min_strike: data.min_strike,
        max_strike: data.max_strike,
        type: data.type,
        "expiry_dates[]": data.expiry_dates,
        min_marketcap: data.min_marketcap,
        max_marketcap: data.max_marketcap,
        min_volume: data.min_volume,
        max_volume: data.max_volume,
        // 30-day average volume filters
        min_ticker_30_d_avg_volume: data.min_ticker_30_d_avg_volume,
        max_ticker_30_d_avg_volume: data.max_ticker_30_d_avg_volume,
        min_contract_30_d_avg_volume: data.min_contract_30_d_avg_volume,
        max_contract_30_d_avg_volume: data.max_contract_30_d_avg_volume,
        // Multileg and floor volume ratio filters
        min_multileg_volume_ratio: data.min_multileg_volume_ratio,
        max_multileg_volume_ratio: data.max_multileg_volume_ratio,
        min_floor_volume_ratio: data.min_floor_volume_ratio,
        max_floor_volume_ratio: data.max_floor_volume_ratio,
        // Percentage change filters
        min_perc_change: data.min_perc_change,
        max_perc_change: data.max_perc_change,
        min_daily_perc_change: data.min_daily_perc_change,
        max_daily_perc_change: data.max_daily_perc_change,
        // Average price filters
        min_avg_price: data.min_avg_price,
        max_avg_price: data.max_avg_price,
        // Volume/OI ratio filters
        min_volume_oi_ratio: data.min_volume_oi_ratio,
        max_volume_oi_ratio: data.max_volume_oi_ratio,
        // Open interest filters
        min_open_interest: data.min_open_interest,
        max_open_interest: data.max_open_interest,
        // Floor volume filters
        min_floor_volume: data.min_floor_volume,
        max_floor_volume: data.max_floor_volume,
        // Volume > OI filter
        vol_greater_oi: data.vol_greater_oi,
        // Issue types
        "issue_types[]": data.issue_types,
        // Ask/bid percentage filters
        min_ask_perc: data.min_ask_perc,
        max_ask_perc: data.max_ask_perc,
        min_bid_perc: data.min_bid_perc,
        max_bid_perc: data.max_bid_perc,
        // Skew percentage filters
        min_skew_perc: data.min_skew_perc,
        max_skew_perc: data.max_skew_perc,
        // Bull/bear percentage filters
        min_bull_perc: data.min_bull_perc,
        max_bull_perc: data.max_bull_perc,
        min_bear_perc: data.min_bear_perc,
        max_bear_perc: data.max_bear_perc,
        // 7-day bid/ask side percentage filters
        min_bid_side_perc_7_day: data.min_bid_side_perc_7_day,
        max_bid_side_perc_7_day: data.max_bid_side_perc_7_day,
        min_ask_side_perc_7_day: data.min_ask_side_perc_7_day,
        max_ask_side_perc_7_day: data.max_ask_side_perc_7_day,
        // Days of OI increases filters
        min_days_of_oi_increases: data.min_days_of_oi_increases,
        max_days_of_oi_increases: data.max_days_of_oi_increases,
        // Days of volume > OI filters
        min_days_of_vol_greater_than_oi: data.min_days_of_vol_greater_than_oi,
        max_days_of_vol_greater_than_oi: data.max_days_of_vol_greater_than_oi,
        // IV percentage filters
        min_iv_perc: data.min_iv_perc,
        max_iv_perc: data.max_iv_perc,
        // Greek filters
        min_delta: data.min_delta,
        max_delta: data.max_delta,
        min_gamma: data.min_gamma,
        max_gamma: data.max_gamma,
        min_theta: data.min_theta,
        max_theta: data.max_theta,
        min_vega: data.min_vega,
        max_vega: data.max_vega,
        // Return on capital filters
        min_return_on_capital_perc: data.min_return_on_capital_perc,
        max_return_on_capital_perc: data.max_return_on_capital_perc,
        // OI change filters
        min_oi_change_perc: data.min_oi_change_perc,
        max_oi_change_perc: data.max_oi_change_perc,
        min_oi_change: data.min_oi_change,
        max_oi_change: data.max_oi_change,
        // Volume/ticker volume ratio filters
        min_volume_ticker_vol_ratio: data.min_volume_ticker_vol_ratio,
        max_volume_ticker_vol_ratio: data.max_volume_ticker_vol_ratio,
        // Sweep volume ratio filters
        min_sweep_volume_ratio: data.min_sweep_volume_ratio,
        max_sweep_volume_ratio: data.max_sweep_volume_ratio,
        // From low/high percentage filters
        min_from_low_perc: data.min_from_low_perc,
        max_from_low_perc: data.max_from_low_perc,
        min_from_high_perc: data.min_from_high_perc,
        max_from_high_perc: data.max_from_high_perc,
        // Earnings DTE filters
        min_earnings_dte: data.min_earnings_dte,
        max_earnings_dte: data.max_earnings_dte,
        // Transactions filters
        min_transactions: data.min_transactions,
        max_transactions: data.max_transactions,
        // Close price filters
        min_close: data.min_close,
        max_close: data.max_close,
        // Date filter
        date: data.date,
      }))

    case "analysts":
      return formatResponse(await uwFetch("/api/screener/analysts", {
        ticker: data.ticker,
        recommendation: data.recommendation,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
