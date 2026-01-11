import { z } from "zod"
import { dateRegex } from "./common.js"

/** Stock screener filters */
export const stockScreenerFiltersSchema = z.object({
  // Issue types and sectors
  issue_types: z.array(z.string()).describe("Filter by issue types (e.g., Common Stock, ETF, ADR)").optional(),
  sectors: z.array(z.string()).describe("Filter by market sectors (e.g., Technology, Healthcare, Financial Services)").optional(),

  // Price change filters
  min_change: z.number().describe("The minimum percentage change compared to the previous trading day").optional(),
  max_change: z.number().describe("The maximum percentage change compared to the previous trading day").optional(),

  // Underlying price filters
  min_underlying_price: z.number().describe("The minimum stock price").optional(),
  max_underlying_price: z.number().describe("The maximum stock price").optional(),

  // Boolean filters
  is_s_p_500: z.boolean().describe("Only include stocks which are part of the S&P 500 (setting to false has no effect)").optional(),
  has_dividends: z.boolean().describe("Only include stocks which pay dividends (setting to false has no effect)").optional(),

  // 3-day percentage filters
  min_perc_3_day_total: z.number().describe("The minimum ratio of options volume versus 3-day average options volume").optional(),
  max_perc_3_day_total: z.number().describe("The maximum ratio of options volume versus 3-day average options volume").optional(),
  min_perc_3_day_call: z.number().describe("The minimum ratio of call options volume versus 3-day average call options volume").optional(),
  max_perc_3_day_call: z.number().describe("The maximum ratio of call options volume versus 3-day average call options volume").optional(),
  min_perc_3_day_put: z.number().describe("The minimum ratio of put options volume versus 3-day average put options volume").optional(),
  max_perc_3_day_put: z.number().describe("The maximum ratio of put options volume versus 3-day average put options volume").optional(),

  // 30-day percentage filters
  min_perc_30_day_total: z.number().describe("The minimum ratio of options volume versus 30-day average options volume").optional(),
  max_perc_30_day_total: z.number().describe("The maximum ratio of options volume versus 30-day average options volume").optional(),
  min_perc_30_day_call: z.number().describe("The minimum ratio of call options volume versus 30-day average call options volume").optional(),
  max_perc_30_day_call: z.number().describe("The maximum ratio of call options volume versus 30-day average call options volume").optional(),
  min_perc_30_day_put: z.number().describe("The minimum ratio of put options volume versus 30-day average put options volume").optional(),
  max_perc_30_day_put: z.number().describe("The maximum ratio of put options volume versus 30-day average put options volume").optional(),

  // OI change percentage filters
  min_total_oi_change_perc: z.number().describe("The minimum open interest change percentage compared to the previous day").optional(),
  max_total_oi_change_perc: z.number().describe("The maximum open interest change percentage compared to the previous day").optional(),
  min_call_oi_change_perc: z.number().describe("The minimum open interest change percentage of call contracts compared to the previous day").optional(),
  max_call_oi_change_perc: z.number().describe("The maximum open interest change percentage of call contracts compared to the previous day").optional(),
  min_put_oi_change_perc: z.number().describe("The minimum open interest change percentage of put contracts compared to the previous day").optional(),
  max_put_oi_change_perc: z.number().describe("The maximum open interest change percentage of put contracts compared to the previous day").optional(),

  // Implied move filters
  min_implied_move: z.number().describe("The minimum implied move in dollars").optional(),
  max_implied_move: z.number().describe("The maximum implied move in dollars").optional(),
  min_implied_move_perc: z.number().describe("The minimum implied move as a percentage").optional(),
  max_implied_move_perc: z.number().describe("The maximum implied move as a percentage").optional(),

  // Volatility and IV rank filters
  min_volatility: z.number().describe("The minimum implied volatility").optional(),
  max_volatility: z.number().describe("The maximum implied volatility").optional(),
  min_iv_rank: z.number().describe("The minimum IV rank (a measure of where current implied volatility stands relative to its historical range)").optional(),
  max_iv_rank: z.number().describe("The maximum IV rank (a measure of where current implied volatility stands relative to its historical range)").optional(),

  // Call/put volume filters
  min_call_volume: z.number().int().nonnegative().describe("The minimum call options volume").optional(),
  max_call_volume: z.number().int().nonnegative().describe("The maximum call options volume").optional(),
  min_put_volume: z.number().int().nonnegative().describe("The minimum put options volume").optional(),
  max_put_volume: z.number().int().nonnegative().describe("The maximum put options volume").optional(),

  // Call/put premium filters
  min_call_premium: z.number().describe("The minimum call options premium").optional(),
  max_call_premium: z.number().describe("The maximum call options premium").optional(),
  min_put_premium: z.number().describe("The minimum put options premium").optional(),
  max_put_premium: z.number().describe("The maximum put options premium").optional(),

  // Net premium filters
  min_net_premium: z.number().describe("The minimum net options premium (bullish minus bearish premium)").optional(),
  max_net_premium: z.number().describe("The maximum net options premium (bullish minus bearish premium)").optional(),
  min_net_call_premium: z.number().describe("The minimum net call options premium").optional(),
  max_net_call_premium: z.number().describe("The maximum net call options premium").optional(),
  min_net_put_premium: z.number().describe("The minimum net put options premium").optional(),
  max_net_put_premium: z.number().describe("The maximum net put options premium").optional(),

  // OI vs volume filters
  min_oi_vs_vol: z.number().describe("The minimum ratio of open interest to options volume").optional(),
  max_oi_vs_vol: z.number().describe("The maximum ratio of open interest to options volume").optional(),

  // Put/call ratio filters
  min_put_call_ratio: z.number().describe("The minimum put to call ratio").optional(),
  max_put_call_ratio: z.number().describe("The maximum put to call ratio").optional(),

  // Stock volume vs avg filters
  min_stock_volume_vs_avg30_volume: z.number().describe("The minimum ratio of current stock volume to 30-day average volume").optional(),
  max_avg30_volume: z.number().describe("The maximum ratio of current stock volume to 30-day average volume").optional(),

  // Date filter
  date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").describe("Filter by specific date in YYYY-MM-DD format").optional(),
})

/** Option contract screener filters */
export const optionContractScreenerFiltersSchema = z.object({
  // Ticker and sector filters
  ticker_symbol: z.string().describe("Filter by ticker symbol").optional(),
  sectors: z.array(z.string()).describe("Filter by market sectors").optional(),

  // Underlying price filters
  min_underlying_price: z.number().describe("Minimum stock price").optional(),
  max_underlying_price: z.number().describe("Maximum stock price").optional(),

  // Ex-div filter
  exclude_ex_div_ticker: z.boolean().describe("Exclude tickers trading ex-dividend today (useful to filter out dividend arbitrage ITM call flow)").optional(),

  // Diff filters
  min_diff: z.number().describe("Minimum OTM diff of a contract").optional(),
  max_diff: z.number().describe("Maximum OTM diff of a contract").optional(),

  // Strike filters
  min_strike: z.number().describe("Minimum strike price").optional(),
  max_strike: z.number().describe("Maximum strike price").optional(),

  // Option type
  type: z.enum(["call", "Call", "put", "Put"]).describe("Option type filter (call or put)").optional(),

  // Expiry dates
  expiry_dates: z.array(z.string()).describe("Filter by specific expiry dates").optional(),

  // Market cap filters
  min_marketcap: z.number().describe("Minimum market cap").optional(),
  max_marketcap: z.number().describe("Maximum market cap").optional(),

  // Volume filters
  min_volume: z.number().int().nonnegative().describe("Minimum volume on that contract").optional(),
  max_volume: z.number().int().nonnegative().describe("Maximum volume on that contract").optional(),

  // 30-day average volume filters
  min_ticker_30_d_avg_volume: z.number().describe("Minimum 30-day average stock volume for the underlying ticker").optional(),
  max_ticker_30_d_avg_volume: z.number().describe("Maximum 30-day average stock volume for the underlying ticker").optional(),
  min_contract_30_d_avg_volume: z.number().describe("Minimum 30-day average options contract volume for the underlying ticker").optional(),
  max_contract_30_d_avg_volume: z.number().describe("Maximum 30-day average options contract volume for the underlying ticker").optional(),

  // Multileg volume ratio filters
  min_multileg_volume_ratio: z.number().describe("Minimum multi leg volume to contract volume ratio").optional(),
  max_multileg_volume_ratio: z.number().describe("Maximum multi leg volume to contract volume ratio").optional(),

  // Floor volume ratio filters
  min_floor_volume_ratio: z.number().describe("Minimum floor volume to contract volume ratio").optional(),
  max_floor_volume_ratio: z.number().describe("Maximum floor volume to contract volume ratio").optional(),

  // Percentage change filters
  min_perc_change: z.number().describe("Minimum % price change of the contract to the previous day (-1.00 to +inf)").optional(),
  max_perc_change: z.number().describe("Maximum % price change of the contract to the previous day (-1.00 to +inf)").optional(),
  min_daily_perc_change: z.number().describe("Minimum intraday price change of the contract from open till now").optional(),
  max_daily_perc_change: z.number().describe("Maximum intraday price change for the contract since market open").optional(),

  // Average price filters
  min_avg_price: z.number().describe("Minimum average price of the contract").optional(),
  max_avg_price: z.number().describe("Maximum average price of the contract").optional(),

  // Volume/OI ratio filters
  min_volume_oi_ratio: z.number().describe("Minimum contract volume to open interest ratio").optional(),
  max_volume_oi_ratio: z.number().describe("Maximum contract volume to open interest ratio").optional(),

  // Open interest filters
  min_open_interest: z.number().int().nonnegative().describe("Minimum open interest on that contract").optional(),
  max_open_interest: z.number().int().nonnegative().describe("Maximum open interest on that contract").optional(),

  // Floor volume filters
  min_floor_volume: z.number().int().nonnegative().describe("Minimum floor volume on that contract").optional(),
  max_floor_volume: z.number().int().nonnegative().describe("Maximum floor volume on that contract").optional(),

  // Volume > OI filter
  vol_greater_oi: z.boolean().describe("Only include contracts where volume is greater than open interest").optional(),

  // Issue types
  issue_types: z.array(z.string()).describe("Filter by issue types (e.g., Common Stock, ETF, ADR)").optional(),

  // Ask/bid percentage filters
  min_ask_perc: z.number().describe("Minimum ask percentage of volume that transacted on the ask").optional(),
  max_ask_perc: z.number().describe("Maximum ask percentage of volume that transacted on the ask").optional(),
  min_bid_perc: z.number().describe("Minimum bid percentage of volume that transacted on the bid").optional(),
  max_bid_perc: z.number().describe("Maximum bid percentage of volume that transacted on the bid").optional(),

  // Skew percentage filters
  min_skew_perc: z.number().describe("Minimum skew percentage (e.g., 0.8 returns contracts where 80%+ of vol transacted on ask or bid side)").optional(),
  max_skew_perc: z.number().describe("Maximum skew percentage (e.g., 0.8 returns contracts where max 80% of vol transacted on ask or bid side)").optional(),

  // Bull/bear percentage filters
  min_bull_perc: z.number().describe("Minimum bull percentage").optional(),
  max_bull_perc: z.number().describe("Maximum bull percentage").optional(),
  min_bear_perc: z.number().describe("Minimum bear percentage").optional(),
  max_bear_perc: z.number().describe("Maximum bear percentage").optional(),

  // 7-day bid/ask side percentage filters
  min_bid_side_perc_7_day: z.number().describe("Minimum percentage of days over last 7 days where contract traded primarily on the bid side").optional(),
  max_bid_side_perc_7_day: z.number().describe("Maximum percentage of days over last 7 days where contract traded primarily on the bid side").optional(),
  min_ask_side_perc_7_day: z.number().describe("Minimum percentage of days over last 7 days where contract traded primarily on the ask side").optional(),
  max_ask_side_perc_7_day: z.number().describe("Maximum percentage of days over last 7 days where contract traded primarily on the ask side").optional(),

  // Days of OI increases filters
  min_days_of_oi_increases: z.number().int().nonnegative().describe("Minimum days of consecutive trading days where open interest increased").optional(),
  max_days_of_oi_increases: z.number().int().nonnegative().describe("Maximum days of consecutive trading days where open interest increased").optional(),

  // Days of volume > OI filters
  min_days_of_vol_greater_than_oi: z.number().int().nonnegative().describe("Minimum days of consecutive days where volume was greater than open interest").optional(),
  max_days_of_vol_greater_than_oi: z.number().int().nonnegative().describe("Maximum days of consecutive days where volume was greater than open interest").optional(),

  // IV percentage filters
  min_iv_perc: z.number().describe("Minimum implied volatility percentage").optional(),
  max_iv_perc: z.number().describe("Maximum implied volatility percentage").optional(),

  // Greek filters
  min_delta: z.number().describe("Minimum delta (-1.00 to +1.00)").optional(),
  max_delta: z.number().describe("Maximum delta (-1.00 to +1.00)").optional(),
  min_gamma: z.number().describe("Minimum gamma (0.00 to +inf)").optional(),
  max_gamma: z.number().describe("Maximum gamma (0.00 to +inf)").optional(),
  min_theta: z.number().describe("Minimum theta (-inf to 0.00)").optional(),
  max_theta: z.number().describe("Maximum theta (-inf to 0.00)").optional(),
  min_vega: z.number().describe("Minimum vega (0.00 to +inf)").optional(),
  max_vega: z.number().describe("Maximum vega (0.00 to +inf)").optional(),

  // Return on capital filters
  min_return_on_capital_perc: z.number().describe("Minimum return on capital percentage (ROC)").optional(),
  max_return_on_capital_perc: z.number().describe("Maximum return on capital percentage (ROC)").optional(),

  // OI change filters
  min_oi_change_perc: z.number().describe("Minimum open interest change percentage (-1.00 to +inf)").optional(),
  max_oi_change_perc: z.number().describe("Maximum open interest change percentage (-1.00 to +inf)").optional(),
  min_oi_change: z.number().describe("Minimum open interest change as an absolute change").optional(),
  max_oi_change: z.number().describe("Maximum open interest change as an absolute change").optional(),

  // Volume/ticker volume ratio filters
  min_volume_ticker_vol_ratio: z.number().describe("Minimum ratio of contract volume to total option volume of the underlying (0.00 to 1.00)").optional(),
  max_volume_ticker_vol_ratio: z.number().describe("Maximum ratio of contract volume to total option volume of the underlying (0.00 to 1.00)").optional(),

  // Sweep volume ratio filters
  min_sweep_volume_ratio: z.number().describe("Minimum sweep volume ratio (0.00 to 1.00)").optional(),
  max_sweep_volume_ratio: z.number().describe("Maximum sweep volume ratio (0.00 to 1.00)").optional(),

  // From low/high percentage filters
  min_from_low_perc: z.number().describe("Minimum percentage change of current price from today's low (-1.00 to +inf)").optional(),
  max_from_low_perc: z.number().describe("Maximum percentage change of current price from today's low (-1.00 to +inf)").optional(),
  min_from_high_perc: z.number().describe("Minimum percentage change of current price from today's high (-1.00 to +inf)").optional(),
  max_from_high_perc: z.number().describe("Maximum percentage change of current price from today's high (-1.00 to +inf)").optional(),

  // Earnings DTE filters
  min_earnings_dte: z.number().int().describe("Minimum days to earnings").optional(),
  max_earnings_dte: z.number().int().describe("Maximum days to earnings").optional(),

  // Transactions filters
  min_transactions: z.number().int().nonnegative().describe("Minimum number of transactions").optional(),
  max_transactions: z.number().int().nonnegative().describe("Maximum number of transactions").optional(),

  // Close price filters
  min_close: z.number().describe("Minimum contract price (not underlying price)").optional(),
  max_close: z.number().describe("Maximum contract price (not underlying price)").optional(),

  // Date filter
  date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").describe("Filter by specific date (YYYY-MM-DD)").optional(),
})

/** Order by fields for stock screener */
export const stockScreenerOrderBySchema = z.enum([
  "avg_30_day_call_oi",
  "avg_30_day_call_volume",
  "avg_30_day_put_oi",
  "avg_30_day_put_volume",
  "avg_3_day_call_volume",
  "avg_3_day_put_volume",
  "avg_7_day_call_volume",
  "avg_7_day_put_volume",
  "bearish_premium",
  "bullish_premium",
  "call_oi_change",
  "call_oi_change_perc",
  "call_open_interest",
  "call_premium",
  "call_premium_ask_side",
  "call_premium_bid_side",
  "call_volume",
  "call_volume_ask_side",
  "call_volume_bid_side",
  "cum_dir_delta",
  "cum_dir_gamma",
  "cum_dir_vega",
  "date",
  "flex_oi",
  "flex_option_chains",
  "implied_move",
  "implied_move_perc",
  "iv30d",
  "iv30d_1d",
  "iv30d_1m",
  "iv30d_1w",
  "iv_rank",
  "marketcap",
  "net_call_premium",
  "net_premium",
  "net_put_premium",
  "new_chains",
  "next_dividend_date",
  "next_earnings_date",
  "perc_call_vol_ask",
  "perc_call_vol_bid",
  "perc_change",
  "perc_put_vol_ask",
  "perc_put_vol_bid",
  "premium",
  "put_call_ratio",
  "put_oi_change",
  "put_oi_change_perc",
  "put_open_interest",
  "put_premium",
  "put_premium_ask_side",
  "put_premium_bid_side",
  "put_volume",
  "put_volume_ask_side",
  "put_volume_bid_side",
  "ticker",
  "total_oi_change",
  "total_oi_change_perc",
  "total_open_interest",
  "volatility",
  "volume",
]).describe("Order by field for stock screener")

/** Order by fields for option contract screener */
export const optionContractScreenerOrderBySchema = z.enum([
  "bid_ask_vol",
  "bull_bear_vol",
  "contract_pricing",
  "daily_perc_change",
  "diff",
  "dte",
  "earnings",
  "expires",
  "expiry",
  "floor_volume",
  "floor_volume_ratio",
  "from_high",
  "from_low",
  "iv",
  "multileg_volume",
  "open_interest",
  "premium",
  "spread",
  "stock_price",
  "tape_time",
  "ticker",
  "total_multileg_volume_ratio",
  "trades",
  "volume",
  "volume_oi_ratio",
  "volume_ticker_vol_ratio",
]).describe("Order by field for option contract screener")
