import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import {
  stockScreenerOrderBySchema,
  optionContractScreenerOrderBySchema,
} from "../schemas/screener.js"

// Fully explicit schema - all parameters listed for perfect API sync validation
const stocksSchema = z.object({
  action_type: z.literal("stocks"),
  ticker: tickerSchema.optional(),
  order: stockScreenerOrderBySchema.optional(),
  order_direction: z.enum(["asc", "desc"]).default("desc").optional(),

  // Market cap and volume filters
  min_marketcap: z.number().optional(),
  max_marketcap: z.number().optional(),
  min_volume: z.number().int().nonnegative().optional(),
  max_volume: z.number().int().nonnegative().optional(),
  min_oi: z.number().int().nonnegative().optional(),
  max_oi: z.number().int().nonnegative().optional(),
  min_premium: z.number().min(0).optional(),
  max_premium: z.number().min(0).optional(),

  // Issue types and sectors
  issue_types: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),

  // Price change filters
  min_change: z.number().optional(),
  max_change: z.number().optional(),

  // Underlying price filters
  min_underlying_price: z.number().optional(),
  max_underlying_price: z.number().optional(),

  // Boolean filters
  is_s_p_500: z.boolean().optional(),
  has_dividends: z.boolean().optional(),

  // 3-day percentage filters
  min_perc_3_day_total: z.number().optional(),
  max_perc_3_day_total: z.number().optional(),
  min_perc_3_day_call: z.number().optional(),
  max_perc_3_day_call: z.number().optional(),
  min_perc_3_day_put: z.number().optional(),
  max_perc_3_day_put: z.number().optional(),

  // 30-day percentage filters
  min_perc_30_day_total: z.number().optional(),
  max_perc_30_day_total: z.number().optional(),
  min_perc_30_day_call: z.number().optional(),
  max_perc_30_day_call: z.number().optional(),
  min_perc_30_day_put: z.number().optional(),
  max_perc_30_day_put: z.number().optional(),

  // OI change percentage filters
  min_total_oi_change_perc: z.number().optional(),
  max_total_oi_change_perc: z.number().optional(),
  min_call_oi_change_perc: z.number().optional(),
  max_call_oi_change_perc: z.number().optional(),
  min_put_oi_change_perc: z.number().optional(),
  max_put_oi_change_perc: z.number().optional(),

  // Implied move filters
  min_implied_move: z.number().optional(),
  max_implied_move: z.number().optional(),
  min_implied_move_perc: z.number().optional(),
  max_implied_move_perc: z.number().optional(),

  // Volatility and IV rank filters
  min_volatility: z.number().optional(),
  max_volatility: z.number().optional(),
  min_iv_rank: z.number().optional(),
  max_iv_rank: z.number().optional(),

  // Call/put volume filters
  min_call_volume: z.number().int().nonnegative().optional(),
  max_call_volume: z.number().int().nonnegative().optional(),
  min_put_volume: z.number().int().nonnegative().optional(),
  max_put_volume: z.number().int().nonnegative().optional(),

  // Call/put premium filters
  min_call_premium: z.number().optional(),
  max_call_premium: z.number().optional(),
  min_put_premium: z.number().optional(),
  max_put_premium: z.number().optional(),

  // Net premium filters
  min_net_premium: z.number().optional(),
  max_net_premium: z.number().optional(),
  min_net_call_premium: z.number().optional(),
  max_net_call_premium: z.number().optional(),
  min_net_put_premium: z.number().optional(),
  max_net_put_premium: z.number().optional(),

  // OI vs volume filters
  min_oi_vs_vol: z.number().optional(),
  max_oi_vs_vol: z.number().optional(),

  // Put/call ratio filters
  min_put_call_ratio: z.number().optional(),
  max_put_call_ratio: z.number().optional(),

  // Stock volume vs avg filters
  min_stock_volume_vs_avg30_volume: z.number().optional(),
  max_avg30_volume: z.number().optional(),

  // Date filter
  date: z.string().optional(),
})

// Fully explicit schema - all 80+ parameters listed for perfect API sync validation
const optionContractsSchema = z.object({
  action_type: z.literal("option_contracts"),
  limit: z.number().int().min(1).max(250).default(1).optional(),
  page: z.number().int().min(1).optional(),
  order: optionContractScreenerOrderBySchema.optional(),
  order_direction: z.enum(["asc", "desc"]).default("desc").optional(),
  is_otm: z.boolean().optional(),
  min_dte: z.number().int().nonnegative().optional(),
  max_dte: z.number().int().nonnegative().optional(),
  min_premium: z.number().min(0).optional(),
  max_premium: z.number().min(0).optional(),

  // Ticker and sector filters
  ticker_symbol: z.string().optional(),
  sectors: z.array(z.string()).optional(),

  // Underlying price filters
  min_underlying_price: z.number().optional(),
  max_underlying_price: z.number().optional(),

  // Ex-div filter
  exclude_ex_div_ticker: z.boolean().optional(),

  // Diff filters
  min_diff: z.number().optional(),
  max_diff: z.number().optional(),

  // Strike filters
  min_strike: z.number().optional(),
  max_strike: z.number().optional(),

  // Option type
  type: z.enum(["call", "Call", "put", "Put"]).optional(),

  // Expiry dates
  expiry_dates: z.array(z.string()).optional(),

  // Market cap filters
  min_marketcap: z.number().optional(),
  max_marketcap: z.number().optional(),

  // Volume filters
  min_volume: z.number().int().nonnegative().optional(),
  max_volume: z.number().int().nonnegative().optional(),

  // 30-day average volume filters
  min_ticker_30_d_avg_volume: z.number().optional(),
  max_ticker_30_d_avg_volume: z.number().optional(),
  min_contract_30_d_avg_volume: z.number().optional(),
  max_contract_30_d_avg_volume: z.number().optional(),

  // Multileg volume ratio filters
  min_multileg_volume_ratio: z.number().optional(),
  max_multileg_volume_ratio: z.number().optional(),

  // Floor volume ratio filters
  min_floor_volume_ratio: z.number().optional(),
  max_floor_volume_ratio: z.number().optional(),

  // Percentage change filters
  min_perc_change: z.number().optional(),
  max_perc_change: z.number().optional(),
  min_daily_perc_change: z.number().optional(),
  max_daily_perc_change: z.number().optional(),

  // Average price filters
  min_avg_price: z.number().optional(),
  max_avg_price: z.number().optional(),

  // Volume/OI ratio filters
  min_volume_oi_ratio: z.number().optional(),
  max_volume_oi_ratio: z.number().optional(),

  // Open interest filters
  min_open_interest: z.number().int().nonnegative().optional(),
  max_open_interest: z.number().int().nonnegative().optional(),

  // Floor volume filters
  min_floor_volume: z.number().int().nonnegative().optional(),
  max_floor_volume: z.number().int().nonnegative().optional(),

  // Volume > OI filter
  vol_greater_oi: z.boolean().optional(),

  // Issue types
  issue_types: z.array(z.string()).optional(),

  // Ask/bid percentage filters
  min_ask_perc: z.number().optional(),
  max_ask_perc: z.number().optional(),
  min_bid_perc: z.number().optional(),
  max_bid_perc: z.number().optional(),

  // Skew percentage filters
  min_skew_perc: z.number().optional(),
  max_skew_perc: z.number().optional(),

  // Bull/bear percentage filters
  min_bull_perc: z.number().optional(),
  max_bull_perc: z.number().optional(),
  min_bear_perc: z.number().optional(),
  max_bear_perc: z.number().optional(),

  // 7-day bid/ask side percentage filters
  min_bid_side_perc_7_day: z.number().optional(),
  max_bid_side_perc_7_day: z.number().optional(),
  min_ask_side_perc_7_day: z.number().optional(),
  max_ask_side_perc_7_day: z.number().optional(),

  // Days of OI increases filters
  min_days_of_oi_increases: z.number().int().nonnegative().optional(),
  max_days_of_oi_increases: z.number().int().nonnegative().optional(),

  // Days of volume > OI filters
  min_days_of_vol_greater_than_oi: z.number().int().nonnegative().optional(),
  max_days_of_vol_greater_than_oi: z.number().int().nonnegative().optional(),

  // IV percentage filters
  min_iv_perc: z.number().optional(),
  max_iv_perc: z.number().optional(),

  // Greek filters
  min_delta: z.number().optional(),
  max_delta: z.number().optional(),
  min_gamma: z.number().optional(),
  max_gamma: z.number().optional(),
  min_theta: z.number().optional(),
  max_theta: z.number().optional(),
  min_vega: z.number().optional(),
  max_vega: z.number().optional(),

  // Return on capital filters
  min_return_on_capital_perc: z.number().optional(),
  max_return_on_capital_perc: z.number().optional(),

  // OI change filters
  min_oi_change_perc: z.number().optional(),
  max_oi_change_perc: z.number().optional(),
  min_oi_change: z.number().optional(),
  max_oi_change: z.number().optional(),

  // Volume/ticker volume ratio filters
  min_volume_ticker_vol_ratio: z.number().optional(),
  max_volume_ticker_vol_ratio: z.number().optional(),

  // Sweep volume ratio filters
  min_sweep_volume_ratio: z.number().optional(),
  max_sweep_volume_ratio: z.number().optional(),

  // From low/high percentage filters
  min_from_low_perc: z.number().optional(),
  max_from_low_perc: z.number().optional(),
  min_from_high_perc: z.number().optional(),
  max_from_high_perc: z.number().optional(),

  // Earnings DTE filters
  min_earnings_dte: z.number().int().optional(),
  max_earnings_dte: z.number().int().optional(),

  // Transactions filters
  min_transactions: z.number().int().nonnegative().optional(),
  max_transactions: z.number().int().nonnegative().optional(),

  // Close price filters
  min_close: z.number().optional(),
  max_close: z.number().optional(),

  // Date filter
  date: z.string().optional(),
})

const analystsSchema = z.object({
  action_type: z.literal("analysts"),
  ticker: tickerSchema.optional(),
  limit: z.number().int().min(1).max(500).default(1).optional(),
  recommendation: z.enum(["buy", "hold", "sell"]).optional(),
  action: z.enum(["initiated", "reiterated", "downgraded", "upgraded", "maintained"]).optional(),
})

// Discriminated union of all action schemas
const screenerInputSchema = z.discriminatedUnion("action_type", [
  stocksSchema,
  optionContractsSchema,
  analystsSchema,
])

export const screenerTool = {
  name: "uw_screener",
  description: `Access UnusualWhales screeners for stocks, options, and analysts.

Available actions:
- stocks: Screen stocks with various filters
- option_contracts: Screen option contracts with filters
- analysts: Screen analyst ratings`,
  inputSchema: toJsonSchema(screenerInputSchema),
  zodInputSchema: screenerInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle screener tool requests using the tool factory pattern
 */
export const handleScreener = createToolHandler(screenerInputSchema, {
  stocks: async (data) => {
    return uwFetch("/api/screener/stocks", {
      ticker: data.ticker,
      order: data.order,
      order_direction: data.order_direction,
      // Stock-specific filters
      min_marketcap: data.min_marketcap,
      max_marketcap: data.max_marketcap,
      min_volume: data.min_volume,
      max_volume: data.max_volume,
      min_oi: data.min_oi,
      max_oi: data.max_oi,
      min_premium: data.min_premium,
      max_premium: data.max_premium,
      // Stock screener filters
      "issue_types[]": data.issue_types,
      "sectors[]": data.sectors,
      min_change: data.min_change,
      max_change: data.max_change,
      min_underlying_price: data.min_underlying_price,
      max_underlying_price: data.max_underlying_price,
      is_s_p_500: data.is_s_p_500,
      has_dividends: data.has_dividends,
      min_perc_3_day_total: data.min_perc_3_day_total,
      max_perc_3_day_total: data.max_perc_3_day_total,
      min_perc_3_day_call: data.min_perc_3_day_call,
      max_perc_3_day_call: data.max_perc_3_day_call,
      min_perc_3_day_put: data.min_perc_3_day_put,
      max_perc_3_day_put: data.max_perc_3_day_put,
      min_perc_30_day_total: data.min_perc_30_day_total,
      max_perc_30_day_total: data.max_perc_30_day_total,
      min_perc_30_day_call: data.min_perc_30_day_call,
      max_perc_30_day_call: data.max_perc_30_day_call,
      min_perc_30_day_put: data.min_perc_30_day_put,
      max_perc_30_day_put: data.max_perc_30_day_put,
      min_total_oi_change_perc: data.min_total_oi_change_perc,
      max_total_oi_change_perc: data.max_total_oi_change_perc,
      min_call_oi_change_perc: data.min_call_oi_change_perc,
      max_call_oi_change_perc: data.max_call_oi_change_perc,
      min_put_oi_change_perc: data.min_put_oi_change_perc,
      max_put_oi_change_perc: data.max_put_oi_change_perc,
      min_implied_move: data.min_implied_move,
      max_implied_move: data.max_implied_move,
      min_implied_move_perc: data.min_implied_move_perc,
      max_implied_move_perc: data.max_implied_move_perc,
      min_volatility: data.min_volatility,
      max_volatility: data.max_volatility,
      min_iv_rank: data.min_iv_rank,
      max_iv_rank: data.max_iv_rank,
      min_call_volume: data.min_call_volume,
      max_call_volume: data.max_call_volume,
      min_put_volume: data.min_put_volume,
      max_put_volume: data.max_put_volume,
      min_call_premium: data.min_call_premium,
      max_call_premium: data.max_call_premium,
      min_put_premium: data.min_put_premium,
      max_put_premium: data.max_put_premium,
      min_net_premium: data.min_net_premium,
      max_net_premium: data.max_net_premium,
      min_net_call_premium: data.min_net_call_premium,
      max_net_call_premium: data.max_net_call_premium,
      min_net_put_premium: data.min_net_put_premium,
      max_net_put_premium: data.max_net_put_premium,
      min_oi_vs_vol: data.min_oi_vs_vol,
      max_oi_vs_vol: data.max_oi_vs_vol,
      min_put_call_ratio: data.min_put_call_ratio,
      max_put_call_ratio: data.max_put_call_ratio,
      min_stock_volume_vs_avg30_volume: data.min_stock_volume_vs_avg30_volume,
      max_avg30_volume: data.max_avg30_volume,
      date: data.date,
    })
  },

  option_contracts: async (data) => {
    return uwFetch("/api/screener/option-contracts", {
      limit: data.limit,
      page: data.page,
      order: data.order,
      order_direction: data.order_direction,
      is_otm: data.is_otm,
      min_dte: data.min_dte,
      max_dte: data.max_dte,
      min_premium: data.min_premium,
      max_premium: data.max_premium,
      // Option contract screener filters
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
      min_ticker_30_d_avg_volume: data.min_ticker_30_d_avg_volume,
      max_ticker_30_d_avg_volume: data.max_ticker_30_d_avg_volume,
      min_contract_30_d_avg_volume: data.min_contract_30_d_avg_volume,
      max_contract_30_d_avg_volume: data.max_contract_30_d_avg_volume,
      min_multileg_volume_ratio: data.min_multileg_volume_ratio,
      max_multileg_volume_ratio: data.max_multileg_volume_ratio,
      min_floor_volume_ratio: data.min_floor_volume_ratio,
      max_floor_volume_ratio: data.max_floor_volume_ratio,
      min_perc_change: data.min_perc_change,
      max_perc_change: data.max_perc_change,
      min_daily_perc_change: data.min_daily_perc_change,
      max_daily_perc_change: data.max_daily_perc_change,
      min_avg_price: data.min_avg_price,
      max_avg_price: data.max_avg_price,
      min_volume_oi_ratio: data.min_volume_oi_ratio,
      max_volume_oi_ratio: data.max_volume_oi_ratio,
      min_open_interest: data.min_open_interest,
      max_open_interest: data.max_open_interest,
      min_floor_volume: data.min_floor_volume,
      max_floor_volume: data.max_floor_volume,
      vol_greater_oi: data.vol_greater_oi,
      "issue_types[]": data.issue_types,
      min_ask_perc: data.min_ask_perc,
      max_ask_perc: data.max_ask_perc,
      min_bid_perc: data.min_bid_perc,
      max_bid_perc: data.max_bid_perc,
      min_skew_perc: data.min_skew_perc,
      max_skew_perc: data.max_skew_perc,
      min_bull_perc: data.min_bull_perc,
      max_bull_perc: data.max_bull_perc,
      min_bear_perc: data.min_bear_perc,
      max_bear_perc: data.max_bear_perc,
      min_bid_side_perc_7_day: data.min_bid_side_perc_7_day,
      max_bid_side_perc_7_day: data.max_bid_side_perc_7_day,
      min_ask_side_perc_7_day: data.min_ask_side_perc_7_day,
      max_ask_side_perc_7_day: data.max_ask_side_perc_7_day,
      min_days_of_oi_increases: data.min_days_of_oi_increases,
      max_days_of_oi_increases: data.max_days_of_oi_increases,
      min_days_of_vol_greater_than_oi: data.min_days_of_vol_greater_than_oi,
      max_days_of_vol_greater_than_oi: data.max_days_of_vol_greater_than_oi,
      min_iv_perc: data.min_iv_perc,
      max_iv_perc: data.max_iv_perc,
      min_delta: data.min_delta,
      max_delta: data.max_delta,
      min_gamma: data.min_gamma,
      max_gamma: data.max_gamma,
      min_theta: data.min_theta,
      max_theta: data.max_theta,
      min_vega: data.min_vega,
      max_vega: data.max_vega,
      min_return_on_capital_perc: data.min_return_on_capital_perc,
      max_return_on_capital_perc: data.max_return_on_capital_perc,
      min_oi_change_perc: data.min_oi_change_perc,
      max_oi_change_perc: data.max_oi_change_perc,
      min_oi_change: data.min_oi_change,
      max_oi_change: data.max_oi_change,
      min_volume_ticker_vol_ratio: data.min_volume_ticker_vol_ratio,
      max_volume_ticker_vol_ratio: data.max_volume_ticker_vol_ratio,
      min_sweep_volume_ratio: data.min_sweep_volume_ratio,
      max_sweep_volume_ratio: data.max_sweep_volume_ratio,
      min_from_low_perc: data.min_from_low_perc,
      max_from_low_perc: data.max_from_low_perc,
      min_from_high_perc: data.min_from_high_perc,
      max_from_high_perc: data.max_from_high_perc,
      min_earnings_dte: data.min_earnings_dte,
      max_earnings_dte: data.max_earnings_dte,
      min_transactions: data.min_transactions,
      max_transactions: data.max_transactions,
      min_close: data.min_close,
      max_close: data.max_close,
      date: data.date,
    })
  },

  analysts: async (data) => {
    return uwFetch("/api/screener/analysts", {
      ticker: data.ticker,
      limit: data.limit,
      recommendation: data.recommendation,
      action: data.action,
    })
  },
})
