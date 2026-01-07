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
  candle_size: candleSizeSchema.optional(),
  strike: strikeSchema.optional(),
  min_strike: z.number().describe("Minimum strike price filter").optional(),
  max_strike: z.number().describe("Maximum strike price filter").optional(),
  option_type: optionTypeSchema.optional(),
  limit: limitSchema.optional(),
  timeframe: timeframeSchema.optional(),
  delta: deltaSchema.optional(),
})


export const stockTool = {
  name: "uw_stock",
  description: `Access UnusualWhales stock data including options chains, greeks, IV, OHLC candles, open interest, and more.

Available actions:
- info: Get stock information (ticker required)
- ohlc: Get OHLC candles (ticker, candle_size required; date optional)
- option_chains: Get option chains (ticker required; expiry, min_strike, max_strike optional)
- option_contracts: Get option contracts (ticker required; expiry, strike, option_type optional)
- greeks: Get greeks data (ticker required; expiry optional)
- greek_exposure: Get gamma/delta/vanna exposure (ticker required; date optional)
- greek_exposure_by_expiry: Get greek exposure by expiry (ticker required; date optional)
- greek_exposure_by_strike: Get greek exposure by strike (ticker required; date optional)
- greek_exposure_by_strike_expiry: Get greek exposure by strike and expiry (ticker required; expiry, date optional)
- greek_flow: Get greek flow (ticker required; date optional)
- greek_flow_by_expiry: Get greek flow by expiry (ticker, expiry required; date optional)
- iv_rank: Get IV rank (ticker required; date optional)
- interpolated_iv: Get interpolated IV (ticker required; expiry optional)
- max_pain: Get max pain (ticker required; expiry optional)
- oi_change: Get OI change (ticker required; date optional)
- oi_per_expiry: Get OI per expiry (ticker required; date optional)
- oi_per_strike: Get OI per strike (ticker required; expiry, date optional)
- options_volume: Get options volume (ticker required; date optional)
- volume_oi_expiry: Get volume/OI by expiry (ticker required; date optional)
- atm_chains: Get ATM chains (ticker required; date optional)
- expiry_breakdown: Get expiry breakdown (ticker required; date optional)
- flow_alerts: Get flow alerts for ticker (ticker required; date optional)
- flow_per_expiry: Get flow per expiry (ticker required; date optional)
- flow_per_strike: Get flow per strike (ticker required; expiry optional)
- flow_per_strike_intraday: Get intraday flow per strike (ticker required; expiry, date optional)
- flow_recent: Get recent flow (ticker required; limit optional)
- net_prem_ticks: Get net premium ticks (ticker required; date optional)
- nope: Get NOPE data (ticker required; date optional)
- stock_price_levels: Get stock price levels (ticker required; date optional)
- stock_volume_price_levels: Get volume price levels (ticker required; date optional)
- spot_exposures: Get spot exposures (ticker required; date optional)
- spot_exposures_by_expiry_strike: Get spot exposures by expiry/strike (ticker required; date optional)
- spot_exposures_by_strike: Get spot exposures by strike (ticker required; date optional)
- spot_exposures_expiry_strike: Get spot exposures for specific expiry (ticker, expiry required; date optional)
- historical_risk_reversal_skew: Get risk reversal skew (ticker, expiry, delta required; date, timeframe optional)
- volatility_realized: Get realized volatility (ticker required; timeframe optional)
- volatility_stats: Get volatility stats (ticker required)
- volatility_term_structure: Get term structure (ticker required; date optional)
- stock_state: Get stock state (ticker required; date optional)
- insider_buy_sells: Get insider buy/sells for stock (ticker required; limit optional)
- ownership: Get ownership data (ticker required)
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

  const { action, ticker, sector, date, expiry, candle_size, strike, min_strike, max_strike, option_type, limit, timeframe, delta } = parsed.data

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
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/ohlc/${safeCandle}`, { date }))

    case "option_chains":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/option-chains`, {
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
      }))

    case "greeks":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greeks`, { expiry }))

    case "greek_exposure":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/greek-exposure`, { date }))

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
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/iv-rank`, { date }))

    case "interpolated_iv":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/interpolated-iv`, { expiry }))

    case "max_pain":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/max-pain`, { expiry }))

    case "oi_change":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/oi-change`, { date }))

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
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/options-volume`, { date }))

    case "volume_oi_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/option/volume-oi-expiry`, { date }))

    case "atm_chains":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/atm-chains`, { date }))

    case "expiry_breakdown":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/expiry-breakdown`, { date }))

    case "flow_alerts":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-alerts`, { date }))

    case "flow_per_expiry":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-per-expiry`, { date }))

    case "flow_per_strike":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-per-strike`, { expiry }))

    case "flow_per_strike_intraday":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-per-strike-intraday`, {
        expiry,
        date,
      }))

    case "flow_recent":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/flow-recent`, { limit }))

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
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures/expiry-strike`, { date }))

    case "spot_exposures_by_strike":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures/strike`, { date }))

    case "spot_exposures_expiry_strike":
      if (!ticker || !expiry) return formatError("ticker and expiry are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/spot-exposures/${safeExpiry}/strike`, { date }))

    case "historical_risk_reversal_skew":
      if (!ticker || !expiry || !delta) return formatError("ticker, expiry, and delta are required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/historical-risk-reversal-skew`, { expiry, delta, date, timeframe }))

    case "volatility_realized":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/volatility/realized`, { timeframe }))

    case "volatility_stats":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/volatility/stats`))

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
      return formatResponse(await uwFetch(`/api/stock/${safeTicker}/ownership`))

    case "tickers_by_sector":
      if (!sector) return formatError("sector is required")
      return formatResponse(await uwFetch(`/api/stock/${safeSector}/tickers`))

    case "ticker_exchanges":
      return formatResponse(await uwFetch("/api/stock-directory/ticker-exchanges"))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
