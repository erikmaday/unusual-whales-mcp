import { z } from "zod"
import { uwFetch } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  dateSchema,
  expirySchema,
  limitSchema,
  optionTypeSchema,
  sideSchema,
  orderDirectionSchema,
  candleSizeSchema,
  timeframeSchema,
  deltaSchema,
  pageSchema,
  timespanSchema,
  filterSchema,
} from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Sector enum reused across actions
const sectorEnum = z.enum([
  "Basic Materials",
  "Communication Services",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Energy",
  "Financial Services",
  "Healthcare",
  "Industrials",
  "Real Estate",
  "Technology",
  "Utilities",
])

// Explicit per-action schemas
const infoSchema = z.object({
  action: z.literal("info"),
  ticker: tickerSchema,
})

const ohlcSchema = z.object({
  action: z.literal("ohlc"),
  ticker: tickerSchema,
  candle_size: candleSizeSchema,
  date: dateSchema.optional(),
  timeframe: timeframeSchema.optional(),
  end_date: dateSchema.optional(),
  limit: z.number().int().min(1).max(2500).optional(),
})

const optionChainsSchema = z.object({
  action: z.literal("option_chains"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const optionContractsSchema = z.object({
  action: z.literal("option_contracts"),
  ticker: tickerSchema,
  expiry: expirySchema,
  option_type: optionTypeSchema.optional(),
  vol_greater_oi: z.boolean().optional(),
  exclude_zero_vol_chains: z.boolean().optional(),
  exclude_zero_dte: z.boolean().optional(),
  exclude_zero_oi_chains: z.boolean().optional(),
  maybe_otm_only: z.boolean().optional(),
  option_symbol: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(500).optional(),
  page: pageSchema.optional(),
})

const greeksSchema = z.object({
  action: z.literal("greeks"),
  ticker: tickerSchema,
  expiry: expirySchema,
  date: dateSchema.optional(),
})

const greekExposureSchema = z.object({
  action: z.literal("greek_exposure"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
  timeframe: timeframeSchema.optional(),
})

const greekExposureByExpirySchema = z.object({
  action: z.literal("greek_exposure_by_expiry"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const greekExposureByStrikeSchema = z.object({
  action: z.literal("greek_exposure_by_strike"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const greekExposureByStrikeExpirySchema = z.object({
  action: z.literal("greek_exposure_by_strike_expiry"),
  ticker: tickerSchema,
  expiry: expirySchema,
  date: dateSchema.optional(),
})

const greekFlowSchema = z.object({
  action: z.literal("greek_flow"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const greekFlowByExpirySchema = z.object({
  action: z.literal("greek_flow_by_expiry"),
  ticker: tickerSchema,
  expiry: expirySchema,
  date: dateSchema.optional(),
})

const ivRankSchema = z.object({
  action: z.literal("iv_rank"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
  timespan: timespanSchema.optional(),
})

const interpolatedIvSchema = z.object({
  action: z.literal("interpolated_iv"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const maxPainSchema = z.object({
  action: z.literal("max_pain"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const oiChangeSchema = z.object({
  action: z.literal("oi_change"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
  limit: limitSchema.optional(),
  page: pageSchema.optional(),
  order: orderDirectionSchema.optional(),
})

const oiPerExpirySchema = z.object({
  action: z.literal("oi_per_expiry"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const oiPerStrikeSchema = z.object({
  action: z.literal("oi_per_strike"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const optionsVolumeSchema = z.object({
  action: z.literal("options_volume"),
  ticker: tickerSchema,
  limit: z.number().int().min(1).max(500).default(1).optional(),
})

const volumeOiExpirySchema = z.object({
  action: z.literal("volume_oi_expiry"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const atmChainsSchema = z.object({
  action: z.literal("atm_chains"),
  ticker: tickerSchema,
  expirations: z.array(expirySchema).min(1),
})

const expiryBreakdownSchema = z.object({
  action: z.literal("expiry_breakdown"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const flowPerExpirySchema = z.object({
  action: z.literal("flow_per_expiry"),
  ticker: tickerSchema,
})

const flowPerStrikeSchema = z.object({
  action: z.literal("flow_per_strike"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const flowPerStrikeIntradaySchema = z.object({
  action: z.literal("flow_per_strike_intraday"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
  filter: filterSchema.optional(),
})

const flowRecentSchema = z.object({
  action: z.literal("flow_recent"),
  ticker: tickerSchema,
  side: sideSchema.default("ALL").optional(),
  min_premium: z.number().min(0).default(0).optional(),
})

const netPremTicksSchema = z.object({
  action: z.literal("net_prem_ticks"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const nopeSchema = z.object({
  action: z.literal("nope"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const stockPriceLevelsSchema = z.object({
  action: z.literal("stock_price_levels"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const stockVolumePriceLevelsSchema = z.object({
  action: z.literal("stock_volume_price_levels"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const spotExposuresSchema = z.object({
  action: z.literal("spot_exposures"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const spotExposuresByExpiryStrikeSchema = z.object({
  action: z.literal("spot_exposures_by_expiry_strike"),
  ticker: tickerSchema,
  expirations: z.array(expirySchema).min(1),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(500).default(500).optional(),
  page: pageSchema.optional(),
  min_strike: z.number().min(0).optional(),
  max_strike: z.number().min(0).optional(),
  min_dte: z.number().int().nonnegative().optional(),
  max_dte: z.number().int().nonnegative().optional(),
})

const spotExposuresByStrikeSchema = z.object({
  action: z.literal("spot_exposures_by_strike"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
  min_strike: z.number().min(0).optional(),
  max_strike: z.number().min(0).optional(),
  limit: z.number().int().min(1).max(500).default(500).optional(),
  page: pageSchema.optional(),
})

const spotExposuresExpiryStrikeSchema = z.object({
  action: z.literal("spot_exposures_expiry_strike"),
  ticker: tickerSchema,
  expiry: expirySchema,
  date: dateSchema.optional(),
  min_strike: z.number().min(0).optional(),
  max_strike: z.number().min(0).optional(),
})

const historicalRiskReversalSkewSchema = z.object({
  action: z.literal("historical_risk_reversal_skew"),
  ticker: tickerSchema,
  expiry: expirySchema,
  delta: deltaSchema,
  date: dateSchema.optional(),
  timeframe: timeframeSchema.optional(),
})

const volatilityRealizedSchema = z.object({
  action: z.literal("volatility_realized"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
  timeframe: timeframeSchema.optional(),
})

const volatilityStatsSchema = z.object({
  action: z.literal("volatility_stats"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const volatilityTermStructureSchema = z.object({
  action: z.literal("volatility_term_structure"),
  ticker: tickerSchema,
  date: dateSchema.optional(),
})

const stockStateSchema = z.object({
  action: z.literal("stock_state"),
  ticker: tickerSchema,
})

const insiderBuySellsSchema = z.object({
  action: z.literal("insider_buy_sells"),
  ticker: tickerSchema,
})

const ownershipSchema = z.object({
  action: z.literal("ownership"),
  ticker: tickerSchema,
  limit: z.number().int().min(1).max(100).default(20).optional(),
})

const tickersBySectorSchema = z.object({
  action: z.literal("tickers_by_sector"),
  sector: sectorEnum,
})

const tickerExchangesSchema = z.object({
  action: z.literal("ticker_exchanges"),
})

// Discriminated union of all action schemas
const stockInputSchema = z.discriminatedUnion("action", [
  infoSchema,
  ohlcSchema,
  optionChainsSchema,
  optionContractsSchema,
  greeksSchema,
  greekExposureSchema,
  greekExposureByExpirySchema,
  greekExposureByStrikeSchema,
  greekExposureByStrikeExpirySchema,
  greekFlowSchema,
  greekFlowByExpirySchema,
  ivRankSchema,
  interpolatedIvSchema,
  maxPainSchema,
  oiChangeSchema,
  oiPerExpirySchema,
  oiPerStrikeSchema,
  optionsVolumeSchema,
  volumeOiExpirySchema,
  atmChainsSchema,
  expiryBreakdownSchema,
  flowPerExpirySchema,
  flowPerStrikeSchema,
  flowPerStrikeIntradaySchema,
  flowRecentSchema,
  netPremTicksSchema,
  nopeSchema,
  stockPriceLevelsSchema,
  stockVolumePriceLevelsSchema,
  spotExposuresSchema,
  spotExposuresByExpiryStrikeSchema,
  spotExposuresByStrikeSchema,
  spotExposuresExpiryStrikeSchema,
  historicalRiskReversalSkewSchema,
  volatilityRealizedSchema,
  volatilityStatsSchema,
  volatilityTermStructureSchema,
  stockStateSchema,
  insiderBuySellsSchema,
  ownershipSchema,
  tickersBySectorSchema,
  tickerExchangesSchema,
])

export const stockTool = {
  name: "uw_stock",
  description: `Access UnusualWhales stock data including options chains, greeks, IV, OHLC candles, open interest, and more.

Available actions:
- info: Get stock information (ticker required)
- ohlc: Get OHLC candles (ticker, candle_size required; date, timeframe, end_date, limit optional)
- option_chains: Get option chains (ticker required; date optional)
- option_contracts: Get option contracts (ticker, expiry required; option_type, filters, limit optional)
- greeks: Get greeks data (ticker, expiry required; date optional)
- greek_exposure: Get gamma/delta/vanna exposure (ticker required; date, timeframe optional)
- greek_exposure_by_expiry: Get greek exposure by expiry (ticker required; date optional)
- greek_exposure_by_strike: Get greek exposure by strike (ticker required; date optional)
- greek_exposure_by_strike_expiry: Get greek exposure by strike and expiry (ticker, expiry required; date optional)
- greek_flow: Get greek flow (ticker required; date optional)
- greek_flow_by_expiry: Get greek flow by expiry (ticker, expiry required; date optional)
- iv_rank: Get IV rank (ticker required; date, timespan optional)
- interpolated_iv: Get interpolated IV (ticker required; date optional)
- max_pain: Get max pain (ticker required; date optional)
- oi_change: Get OI change (ticker required; date, limit, page, order optional)
- oi_per_expiry: Get OI per expiry (ticker required; date optional)
- oi_per_strike: Get OI per strike (ticker required; date optional)
- options_volume: Get options volume (ticker required; limit optional)
- volume_oi_expiry: Get volume/OI by expiry (ticker required; date optional)
- atm_chains: Get ATM chains for given expirations (ticker, expirations required)
- expiry_breakdown: Get expiry breakdown (ticker required; date optional)
- flow_per_expiry: Get flow per expiry (ticker required)
- flow_per_strike: Get flow per strike (ticker required; date optional)
- flow_per_strike_intraday: Get intraday flow per strike (ticker required; date, filter optional)
- flow_recent: Get recent flow (ticker required; side, min_premium optional)
- net_prem_ticks: Get net premium ticks (ticker required; date optional)
- nope: Get NOPE data (ticker required; date optional)
- stock_price_levels: Get stock price levels (ticker required; date optional)
- stock_volume_price_levels: Get volume price levels (ticker required; date optional)
- spot_exposures: Get spot exposures (ticker required; date optional)
- spot_exposures_by_expiry_strike: Get spot exposures by expiry/strike (ticker, expirations required; date, filters optional)
- spot_exposures_by_strike: Get spot exposures by strike (ticker required; date, filters optional)
- spot_exposures_expiry_strike: Get spot exposures for specific expiry (ticker, expiry required; date, strike filters optional)
- historical_risk_reversal_skew: Get risk reversal skew (ticker, expiry, delta required; date, timeframe optional)
- volatility_realized: Get realized volatility (ticker required; date, timeframe optional)
- volatility_stats: Get volatility stats (ticker required; date optional)
- volatility_term_structure: Get term structure (ticker required; date optional)
- stock_state: Get stock state (ticker required)
- insider_buy_sells: Get insider buy/sells for stock (ticker required; limit optional)
- ownership: Get ownership data (ticker required; limit optional)
- tickers_by_sector: Get tickers in sector (sector required)
- ticker_exchanges: Get mapping of all tickers to their exchanges (no params required)`,
  inputSchema: toJsonSchema(stockInputSchema),
  zodInputSchema: stockInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle stock tool requests using the tool factory pattern
 */
export const handleStock = createToolHandler(stockInputSchema, {
  info: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/info")
    return uwFetch(path)
  },

  ohlc: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .add("candle_size", data.candle_size)
      .build("/api/stock/{ticker}/ohlc/{candle_size}")
    return uwFetch(path, {
      date: data.date,
      timeframe: data.timeframe,
      end_date: data.end_date,
      limit: data.limit,
    })
  },

  option_chains: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/option-chains")
    return uwFetch(path, { date: data.date })
  },

  option_contracts: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/option-contracts")
    return uwFetch(path, {
      expiry: data.expiry,
      option_type: data.option_type,
      vol_greater_oi: data.vol_greater_oi,
      exclude_zero_vol_chains: data.exclude_zero_vol_chains,
      exclude_zero_dte: data.exclude_zero_dte,
      exclude_zero_oi_chains: data.exclude_zero_oi_chains,
      maybe_otm_only: data.maybe_otm_only,
      option_symbol: data.option_symbol,
      limit: data.limit,
      page: data.page,
    })
  },

  greeks: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/greeks")
    return uwFetch(path, {
      date: data.date,
      expiry: data.expiry,
    })
  },

  greek_exposure: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/greek-exposure")
    return uwFetch(path, {
      date: data.date,
      timeframe: data.timeframe,
    })
  },

  greek_exposure_by_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/greek-exposure/expiry")
    return uwFetch(path, { date: data.date })
  },

  greek_exposure_by_strike: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/greek-exposure/strike")
    return uwFetch(path, { date: data.date })
  },

  greek_exposure_by_strike_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/greek-exposure/strike-expiry")
    return uwFetch(path, {
      expiry: data.expiry,
      date: data.date,
    })
  },

  greek_flow: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/greek-flow")
    return uwFetch(path, { date: data.date })
  },

  greek_flow_by_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .add("expiry", data.expiry)
      .build("/api/stock/{ticker}/greek-flow/{expiry}")
    return uwFetch(path, { date: data.date })
  },

  iv_rank: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/iv-rank")
    return uwFetch(path, {
      date: data.date,
      timespan: data.timespan,
    })
  },

  interpolated_iv: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/interpolated-iv")
    return uwFetch(path, { date: data.date })
  },

  max_pain: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/max-pain")
    return uwFetch(path, { date: data.date })
  },

  oi_change: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/oi-change")
    return uwFetch(path, {
      date: data.date,
      limit: data.limit,
      page: data.page,
      order: data.order,
    })
  },

  oi_per_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/oi-per-expiry")
    return uwFetch(path, { date: data.date })
  },

  oi_per_strike: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/oi-per-strike")
    return uwFetch(path, { date: data.date })
  },

  options_volume: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/options-volume")
    return uwFetch(path, { limit: data.limit })
  },

  volume_oi_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/option/volume-oi-expiry")
    return uwFetch(path, { date: data.date })
  },

  atm_chains: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/atm-chains")
    return uwFetch(path, { "expirations[]": data.expirations })
  },

  expiry_breakdown: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/expiry-breakdown")
    return uwFetch(path, { date: data.date })
  },

  flow_per_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/flow-per-expiry")
    return uwFetch(path)
  },

  flow_per_strike: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/flow-per-strike")
    return uwFetch(path, { date: data.date })
  },

  flow_per_strike_intraday: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/flow-per-strike-intraday")
    return uwFetch(path, {
      date: data.date,
      filter: data.filter,
    })
  },

  flow_recent: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/flow-recent")
    return uwFetch(path, {
      side: data.side,
      min_premium: data.min_premium,
    })
  },

  net_prem_ticks: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/net-prem-ticks")
    return uwFetch(path, { date: data.date })
  },

  nope: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/nope")
    return uwFetch(path, { date: data.date })
  },

  stock_price_levels: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/option/stock-price-levels")
    return uwFetch(path, { date: data.date })
  },

  stock_volume_price_levels: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/stock-volume-price-levels")
    return uwFetch(path, { date: data.date })
  },

  spot_exposures: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/spot-exposures")
    return uwFetch(path, { date: data.date })
  },

  spot_exposures_by_expiry_strike: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/spot-exposures/expiry-strike")
    return uwFetch(path, {
      "expirations[]": data.expirations,
      date: data.date,
      limit: data.limit,
      page: data.page,
      min_strike: data.min_strike,
      max_strike: data.max_strike,
      min_dte: data.min_dte,
      max_dte: data.max_dte,
    })
  },

  spot_exposures_by_strike: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/spot-exposures/strike")
    return uwFetch(path, {
      date: data.date,
      min_strike: data.min_strike,
      max_strike: data.max_strike,
      limit: data.limit,
      page: data.page,
    })
  },

  spot_exposures_expiry_strike: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/spot-exposures/expiry-strike")
    return uwFetch(path, {
      "expirations[]": [data.expiry],
      date: data.date,
      min_strike: data.min_strike,
      max_strike: data.max_strike,
    })
  },

  historical_risk_reversal_skew: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/historical-risk-reversal-skew")
    return uwFetch(path, {
      expiry: data.expiry,
      delta: data.delta,
      date: data.date,
      timeframe: data.timeframe,
    })
  },

  volatility_realized: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/volatility/realized")
    return uwFetch(path, {
      date: data.date,
      timeframe: data.timeframe,
    })
  },

  volatility_stats: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/volatility/stats")
    return uwFetch(path, { date: data.date })
  },

  volatility_term_structure: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/volatility/term-structure")
    return uwFetch(path, { date: data.date })
  },

  stock_state: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/stock-state")
    return uwFetch(path)
  },

  insider_buy_sells: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/insider-buy-sells")
    return uwFetch(path)
  },

  ownership: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/ownership")
    return uwFetch(path, { limit: data.limit })
  },

  tickers_by_sector: async (data) => {
    const path = new PathParamBuilder()
      .add("sector", data.sector)
      .build("/api/stock/{sector}/tickers")
    return uwFetch(path)
  },

  ticker_exchanges: async () => {
    return uwFetch("/api/stock-directory/ticker-exchanges")
  },
})
