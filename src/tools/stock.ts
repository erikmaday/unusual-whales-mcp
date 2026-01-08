import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  dateSchema,
  expirySchema,
  limitSchema,
  strikeSchema,
  optionTypeSchema,
  candleSizeSchema,
  timeframeSchema,
  deltaSchema,
  formatZodError,
  orderSchema,
  pageSchema,
  timespanSchema,
  optionContractFiltersSchema,
  stockFlowFiltersSchema,
  dteFilterSchema,
} from "../schemas.js"

const stockActions = [
  "info",
  "ohlc",
  "option_chains",
  "option_contracts",
  "greeks",
  "greek_exposure",
  "greek_exposure_by_expiry",
  "greek_exposure_by_strike",
  "greek_exposure_by_strike_expiry",
  "greek_flow",
  "greek_flow_by_expiry",
  "iv_rank",
  "interpolated_iv",
  "max_pain",
  "oi_change",
  "oi_per_expiry",
  "oi_per_strike",
  "options_volume",
  "volume_oi_expiry",
  "atm_chains",
  "expiry_breakdown",
  "flow_alerts",
  "flow_per_expiry",
  "flow_per_strike",
  "flow_per_strike_intraday",
  "flow_recent",
  "net_prem_ticks",
  "nope",
  "stock_price_levels",
  "stock_volume_price_levels",
  "spot_exposures",
  "spot_exposures_by_expiry_strike",
  "spot_exposures_by_strike",
  "spot_exposures_expiry_strike",
  "historical_risk_reversal_skew",
  "volatility_realized",
  "volatility_stats",
  "volatility_term_structure",
  "stock_state",
  "insider_buy_sells",
  "ownership",
  "tickers_by_sector",
  "ticker_exchanges",
] as const

const stockInputSchema = z.object({
  action: z.enum(stockActions).describe("The action to perform"),
  ticker: tickerSchema.optional(),
  sector: z.string().describe("Market sector (for tickers_by_sector action)").optional(),
  date: dateSchema.optional(),
  expiry: expirySchema.optional(),
  expirations: z.array(expirySchema).describe("Array of expiration dates in YYYY-MM-DD format (for atm_chains and spot_exposures_by_expiry_strike actions)").optional(),
  candle_size: candleSizeSchema.optional(),
  strike: strikeSchema.optional(),
  min_strike: z.number().describe("Minimum strike price filter").optional(),
  max_strike: z.number().describe("Maximum strike price filter").optional(),
  option_type: optionTypeSchema.optional(),
  limit: limitSchema.optional(),
  timeframe: timeframeSchema.optional(),
  delta: deltaSchema.optional(),
  // Pagination and ordering
  page: pageSchema.optional(),
  order: orderSchema.optional(),
  // OHLC parameters
  end_date: dateSchema.optional().describe("End date for OHLC data in YYYY-MM-DD format"),
  // IV rank timespan
  timespan: timespanSchema.optional(),
})
  .merge(optionContractFiltersSchema)
  .merge(stockFlowFiltersSchema)
  .merge(dteFilterSchema)


export const stockTool = {
  name: "uw_stock",
  description: `Access UnusualWhales stock data including options chains, greeks, IV, OHLC candles, open interest, and more.

Available actions:
- info: Get stock information (ticker required)
- ohlc: Get OHLC candles (ticker, candle_size required; date, timeframe, end_date, limit optional)
- option_chains: Get option chains (ticker required; date, expiry, min_strike, max_strike optional)
- option_contracts: Get option contracts (ticker required; expiry, strike, option_type, vol_greater_oi, exclude_zero_vol_chains, exclude_zero_dte, exclude_zero_oi_chains, maybe_otm_only, option_symbol, limit, page optional)
- greeks: Get greeks data (ticker required; date, expiry optional)
- greek_exposure: Get gamma/delta/vanna exposure (ticker required; date, timeframe optional)
- greek_exposure_by_expiry: Get greek exposure by expiry (ticker required; date optional)
- greek_exposure_by_strike: Get greek exposure by strike (ticker required; date optional)
- greek_exposure_by_strike_expiry: Get greek exposure by strike and expiry (ticker required; expiry, date optional)
- greek_flow: Get greek flow (ticker required; date optional)
- greek_flow_by_expiry: Get greek flow by expiry (ticker, expiry required; date optional)
- iv_rank: Get IV rank (ticker required; date, timespan optional)
- interpolated_iv: Get interpolated IV (ticker required; date, expiry optional)
- max_pain: Get max pain (ticker required; date, expiry optional)
- oi_change: Get OI change (ticker required; date, limit, page, order optional)
- oi_per_expiry: Get OI per expiry (ticker required; date optional)
- oi_per_strike: Get OI per strike (ticker required; expiry, date optional)
- options_volume: Get options volume (ticker required; date, limit optional)
- volume_oi_expiry: Get volume/OI by expiry (ticker required; date optional)
- atm_chains: Get ATM chains for given expirations (ticker, expirations[] required)
- expiry_breakdown: Get expiry breakdown (ticker required; date optional)
- flow_alerts: Get flow alerts for ticker (ticker required; date, limit, is_ask_side, is_bid_side optional)
- flow_per_expiry: Get flow per expiry (ticker required; date optional)
- flow_per_strike: Get flow per strike (ticker required; date, expiry optional)
- flow_per_strike_intraday: Get intraday flow per strike (ticker required; expiry, date, filter optional)
- flow_recent: Get recent flow (ticker required; limit, side, min_premium optional)
- net_prem_ticks: Get net premium ticks (ticker required; date optional)
- nope: Get NOPE data (ticker required; date optional)
- stock_price_levels: Get stock price levels (ticker required; date optional)
- stock_volume_price_levels: Get volume price levels (ticker required; date optional)
- spot_exposures: Get spot exposures (ticker required; date optional)
- spot_exposures_by_expiry_strike: Get spot exposures by expiry/strike (ticker, expirations required; date, limit, page, min_strike, max_strike, min_dte, max_dte optional)
- spot_exposures_by_strike: Get spot exposures by strike (ticker required; date, min_strike, max_strike, limit, page optional)
- spot_exposures_expiry_strike: Get spot exposures for specific expiry (ticker, expiry required; date, min_strike, max_strike optional)
- historical_risk_reversal_skew: Get risk reversal skew (ticker, expiry, delta required; date, timeframe optional)
- volatility_realized: Get realized volatility (ticker required; date, timeframe optional)
- volatility_stats: Get volatility stats (ticker required; date optional)
- volatility_term_structure: Get term structure (ticker required; date optional)
- stock_state: Get stock state (ticker required; date optional)
- insider_buy_sells: Get insider buy/sells for stock (ticker required; limit optional)
- ownership: Get ownership data (ticker required; limit optional)
- tickers_by_sector: Get tickers in sector (sector required)
- ticker_exchanges: Get mapping of all tickers to their exchanges (no params required)`,
  inputSchema: toJsonSchema(stockInputSchema),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle stock tool requests.
 *
 * @param args - Tool arguments containing action and optional parameters
 * @returns JSON string with stock data or error message
 */
export async function handleStock(args: Record<string, unknown>): Promise<string> {
  const parsed = stockInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const {
    action,
    ticker,
    sector,
    date,
    expiry,
    expirations,
    candle_size,
    strike,
    min_strike,
    max_strike,
    option_type,
    limit,
    timeframe,
    delta,
    // Pagination and ordering
    page,
    order,
    // OHLC parameters
    end_date,
    // IV rank timespan
    timespan,
    // Option contract filters
    vol_greater_oi,
    exclude_zero_vol_chains,
    exclude_zero_dte,
    exclude_zero_oi_chains,
    maybe_otm_only,
    option_symbol,
    // Flow filters
    is_ask_side,
    is_bid_side,
    side,
    min_premium,
    filter,
    // DTE filters
    min_dte,
    max_dte,
  } = parsed.data

  // Encode path parameters once if they exist
  const safeTicker = ticker ? encodePath(ticker) : ""
  const safeExpiry = expiry ? encodePath(expiry) : ""
  const safeSector = sector ? encodePath(sector) : ""
  const safeCandle = candle_size ? encodePath(candle_size) : ""

  switch (action) {
    case "info":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/info`))

    case "ohlc":
      if (!ticker || !candle_size) return formatError("ticker and candle_size are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/ohlc/${safeCandle}`, {
        date,
        timeframe,
        end_date,
        limit,
      }))

    case "option_chains":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/option-chains`, {
        date,
        expiry,
        min_strike,
        max_strike,
      }))

    case "option_contracts":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/option-contracts`, {
        expiry,
        strike,
        option_type,
        vol_greater_oi,
        exclude_zero_vol_chains,
        exclude_zero_dte,
        exclude_zero_oi_chains,
        maybe_otm_only,
        option_symbol,
        limit,
        page,
      }))

    case "greeks":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greeks`, { date, expiry }))

    case "greek_exposure":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-exposure`, { date, timeframe }))

    case "greek_exposure_by_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-exposure/expiry`, { date }))

    case "greek_exposure_by_strike":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-exposure/strike`, { date }))

    case "greek_exposure_by_strike_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-exposure/strike-expiry`, {
        expiry,
        date,
      }))

    case "greek_flow":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-flow`, { date }))

    case "greek_flow_by_expiry":
      if (!ticker || !expiry) return formatError("ticker and expiry are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-flow/${safeExpiry}`, { date }))

    case "iv_rank":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/iv-rank`, { date, timespan }))

    case "interpolated_iv":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/interpolated-iv`, { date, expiry }))

    case "max_pain":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/max-pain`, { date, expiry }))

    case "oi_change":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/oi-change`, { date, limit, page, order }))

    case "oi_per_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/oi-per-expiry`, { date }))

    case "oi_per_strike":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/oi-per-strike`, {
        expiry,
        date,
      }))

    case "options_volume":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/options-volume`, { date, limit }))

    case "volume_oi_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/option/volume-oi-expiry`, { date }))

    case "atm_chains":
      if (!ticker) return formatError("ticker is required")
      if (!expirations || expirations.length === 0) return formatError("expirations[] is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/atm-chains`, { "expirations[]": expirations }))

    case "expiry_breakdown":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/expiry-breakdown`, { date }))

    case "flow_alerts":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-alerts`, { date, limit, is_ask_side, is_bid_side }))

    case "flow_per_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-per-expiry`, { date }))

    case "flow_per_strike":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-per-strike`, { date, expiry }))

    case "flow_per_strike_intraday":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-per-strike-intraday`, {
        expiry,
        date,
        filter,
      }))

    case "flow_recent":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-recent`, { limit, side, min_premium }))

    case "net_prem_ticks":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/net-prem-ticks`, { date }))

    case "nope":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/nope`, { date }))

    case "stock_price_levels":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/option/stock-price-levels`, { date }))

    case "stock_volume_price_levels":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/stock-volume-price-levels`, { date }))

    case "spot_exposures":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures`, { date }))

    case "spot_exposures_by_expiry_strike":
      if (!ticker || !expirations || expirations.length === 0) return formatError("ticker and expirations are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures/expiry-strike`, {
        "expirations[]": expirations,
        date,
        limit,
        page,
        min_strike,
        max_strike,
        min_dte,
        max_dte,
      }))

    case "spot_exposures_by_strike":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures/strike`, {
        date,
        min_strike,
        max_strike,
        limit,
        page,
      }))

    case "spot_exposures_expiry_strike":
      if (!ticker || !expiry) return formatError("ticker and expiry are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures/${safeExpiry}/strike`, {
        date,
        min_strike,
        max_strike,
      }))

    case "historical_risk_reversal_skew":
      if (!ticker || !expiry || !delta) return formatError("ticker, expiry, and delta are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/historical-risk-reversal-skew`, { expiry, delta, date, timeframe }))

    case "volatility_realized":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/volatility/realized`, { date, timeframe }))

    case "volatility_stats":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/volatility/stats`, { date }))

    case "volatility_term_structure":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/volatility/term-structure`, { date }))

    case "stock_state":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/stock-state`, { date }))

    case "insider_buy_sells":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/insider-buy-sells`, { limit }))

    case "ownership":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/ownership`, { limit }))

    case "tickers_by_sector":
      if (!sector) return formatError("sector is required")
      return formatResponse(await uwFetch(`/api/stock/${safeSector}/tickers`))

    case "ticker_exchanges":
      return formatResponse(await uwFetch("/api/stock-directory/ticker-exchanges"))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
