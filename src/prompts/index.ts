import type { Prompt, PromptArgument, PromptMessage } from "@modelcontextprotocol/sdk/types.js"

/**
 * Type definition for a prompt handler function.
 */
export type PromptHandler = (args: Record<string, string>) => Promise<PromptMessage[]>

/**
 * Represents a prompt registration with its definition and handler.
 */
interface PromptRegistration {
  prompt: Prompt
  handler: PromptHandler
}

/**
 * Daily Market Summary Prompt
 * Combines market tide, sector analysis, unusual options flow, and dark pool activity.
 */
const dailySummaryPrompt: Prompt = {
  name: "daily-summary",
  description: "Generate a comprehensive daily market summary with unusual activity",
  arguments: [
    {
      name: "date",
      description: "Date to analyze in YYYY-MM-DD format (default: today)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleDailySummary(args: Record<string, string>): Promise<PromptMessage[]> {
  const date = args.date || "today"
  const content = `Analyze the market for ${date}:

1. Get the current market tide and sector tide to understand overall market sentiment
2. Find the top 10 unusual options flow alerts (sorted by premium) to identify large bets
3. Check dark pool activity for any tickers with large premium transactions
4. Look for any notable correlations or unusual patterns
5. Summarize the key themes and notable trades in a concise format

Focus on identifying:
- Overall market direction and sector rotation
- Tickers with significant institutional interest (dark pool + options flow)
- Any unusual activity that could signal upcoming moves
- Key risk factors or opportunities`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Ticker Deep Dive Prompt
 * Comprehensive analysis of a single ticker across multiple data sources.
 */
const tickerAnalysisPrompt: Prompt = {
  name: "ticker-analysis",
  description: "Comprehensive analysis of a single ticker with stock info, options, dark pool, and insider activity",
  arguments: [
    {
      name: "ticker",
      description: "Stock ticker symbol to analyze (e.g., AAPL, TSLA)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handleTickerAnalysis(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  if (!ticker) {
    throw new Error("ticker argument is required")
  }

  const content = `Perform a comprehensive analysis of ${ticker}:

1. Get stock information (current price, market cap, fundamentals)
2. Analyze recent options flow activity for ${ticker}
   - Look for unusual options activity (large premium, high volume)
   - Identify dominant sentiment (calls vs puts)
   - Check for concentrated bets at specific strikes/expirations
3. Review dark pool activity for ${ticker}
   - Find large block trades
   - Analyze institutional accumulation/distribution patterns
4. Check insider trading activity for ${ticker}
5. Look at any upcoming earnings or FDA events for ${ticker}
6. Review analyst ratings and institutional ownership if available

Provide a summary that includes:
- Current stock position and key metrics
- Options market sentiment and significant trades
- Dark pool institutional activity
- Insider confidence signals
- Upcoming catalysts
- Overall assessment and potential outlook`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Congressional Trading Activity Prompt
 * Track recent congressional trading activity and identify patterns.
 */
const congressTrackerPrompt: Prompt = {
  name: "congress-tracker",
  description: "Track recent congressional trading activity and identify notable patterns",
  arguments: [
    {
      name: "days",
      description: "Number of days to look back (default: 7)",
      required: false,
    },
    {
      name: "min_amount",
      description: "Minimum transaction amount to filter by (e.g., 50000)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleCongressTracker(args: Record<string, string>): Promise<PromptMessage[]> {
  const days = args.days || "7"
  const minAmount = args.min_amount || "15000"

  const content = `Analyze recent congressional trading activity:

1. Get recent congressional trades from the past ${days} days
2. Filter for significant transactions (minimum $${minAmount})
3. Group trades by:
   - Most active traders (which members are trading most)
   - Most traded tickers (which stocks are popular)
   - Sectors getting attention
   - Buying vs selling patterns
4. Identify any clusters or patterns:
   - Multiple members trading the same ticker
   - Unusual timing relative to events or earnings
   - Large purchases or sales that stand out
5. Check for any late-filed reports that might be notable

Provide a summary that includes:
- Top traded tickers by congress members
- Most active congressional traders
- Notable large transactions or unusual patterns
- Sector preferences
- Any potential red flags or interesting correlations`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Morning Market Briefing Prompt
 * Start the day with market tide, sector activity, dark pool prints, and earnings.
 */
const morningBriefingPrompt: Prompt = {
  name: "morning-briefing",
  description: "Morning market briefing with tide, sectors, dark pool, and earnings on deck",
  arguments: [] as PromptArgument[],
}

async function handleMorningBriefing(): Promise<PromptMessage[]> {
  const content = `Give me a morning market briefing:

1. Get the current market tide to understand overnight/premarket sentiment
2. Check which sectors are seeing the most options activity early
3. Look for any notable dark pool prints from premarket or yesterday's close
4. Show what earnings are on deck for today (both premarket and afterhours)
5. Check for any major economic events scheduled today

Summarize:
- Overall market sentiment and direction
- Sectors to watch today
- Key earnings and potential movers
- Any overnight news or developments that matter`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Options Setup Analysis Prompt
 * Analyze whether options are cheap or expensive for a ticker.
 */
const optionsSetupPrompt: Prompt = {
  name: "options-setup",
  description: "Analyze options pricing, IV rank, and volatility structure for a ticker",
  arguments: [
    {
      name: "ticker",
      description: "Stock ticker symbol to analyze (e.g., AAPL, TSLA)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handleOptionsSetup(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  if (!ticker) {
    throw new Error("ticker argument is required")
  }

  const content = `Analyze the options setup for ${ticker}:

1. Get the current IV rank - is implied volatility high or low historically?
2. Show the volatility term structure - is it in contango or backwardation?
3. Get max pain for the nearest monthly expiration
4. Check the put/call ratio and open interest distribution by strike
5. Look at recent options volume patterns

Assess:
- Are options cheap or expensive right now based on IV rank?
- What's the expected move priced into options?
- Where are the key open interest levels (potential support/resistance)?
- Is there any skew in the volatility smile?
- Recommendation: better to buy or sell premium currently?`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Pre-Earnings Analysis Prompt
 * Comprehensive analysis before an earnings announcement.
 */
const preEarningsPrompt: Prompt = {
  name: "pre-earnings",
  description: "Pre-earnings analysis with historical moves, IV, and positioning",
  arguments: [
    {
      name: "ticker",
      description: "Stock ticker symbol to analyze (e.g., AAPL, GOOGL)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handlePreEarnings(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  if (!ticker) {
    throw new Error("ticker argument is required")
  }

  const content = `Analyze ${ticker} ahead of earnings:

1. Get historical earnings data - how has the stock moved on past earnings?
2. Check current IV rank and how it compares to pre-earnings levels historically
3. Look at options volume and open interest for the earnings week expiration
4. Check for any unusual options activity - are there large bets being placed?
5. Review any recent insider transactions before the report
6. Look at institutional positioning changes

Provide:
- Historical earnings move (average and range)
- Current expected move priced into options
- Whether IV is elevated/normal/low vs historical pre-earnings
- Notable options positioning (bullish vs bearish sentiment)
- Any insider signals
- Key levels to watch for the post-earnings reaction`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Unusual Flow Scanner Prompt
 * Find the most unusual options activity across the market.
 */
const unusualFlowPrompt: Prompt = {
  name: "unusual-flow",
  description: "Scan for unusual options activity with large premium and volume",
  arguments: [
    {
      name: "min_premium",
      description: "Minimum premium filter in dollars (default: 100000)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleUnusualFlow(args: Record<string, string>): Promise<PromptMessage[]> {
  const minPremium = args.min_premium || "100000"

  const content = `Find unusual options activity across the market:

1. Get flow alerts filtered for premium over $${minPremium}
2. Look for sweeps and block trades specifically
3. Identify trades where volume significantly exceeds open interest
4. Group findings by ticker to see concentrated activity
5. Separate bullish flow (call buys, put sells) from bearish flow (put buys, call sells)

Highlight:
- Largest premium trades today
- Tickers with multiple unusual trades (cluster activity)
- Any trades with notable characteristics (far OTM, unusual expiration, etc.)
- Overall market sentiment based on flow (more bullish or bearish bets?)
- Top 5 tickers by unusual activity worth watching`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Dark Pool Scanner Prompt
 * Analyze dark pool activity across the market.
 */
const darkPoolScannerPrompt: Prompt = {
  name: "dark-pool-scanner",
  description: "Scan for significant dark pool activity across the market",
  arguments: [
    {
      name: "min_size",
      description: "Minimum trade size filter (default: 1000000)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleDarkPoolScanner(args: Record<string, string>): Promise<PromptMessage[]> {
  const minSize = args.min_size || "1000000"

  const content = `Scan dark pool activity across the market:

1. Get recent dark pool trades, filtering for size over $${minSize}
2. Identify the largest block prints today
3. Look for tickers with unusual dark pool volume relative to normal
4. Analyze whether prints are hitting bid (selling) or lifting offer (buying)
5. Compare dark pool sentiment to options flow for confirmation/divergence

Report:
- Largest dark pool prints today (ticker, size, price level)
- Tickers with concentrated institutional interest
- Any accumulation or distribution patterns
- Dark pool levels that could act as support/resistance
- Comparison to lit market options flow`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Insider Activity Scanner Prompt
 * Track insider buying and selling patterns.
 */
const insiderScannerPrompt: Prompt = {
  name: "insider-scanner",
  description: "Scan for notable insider buying and selling activity",
  arguments: [
    {
      name: "days",
      description: "Number of days to look back (default: 14)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleInsiderScanner(args: Record<string, string>): Promise<PromptMessage[]> {
  const days = args.days || "14"

  const content = `Analyze recent insider trading activity over the past ${days} days:

1. Get insider transactions, focusing on open market purchases and sales
2. Look for cluster buys - multiple insiders buying the same stock
3. Identify large transactions (over $500k)
4. Separate CEO/CFO trades from board member trades
5. Look at sector trends - which sectors are insiders buying/selling?

Highlight:
- Stocks with multiple insider buys (high conviction signal)
- Largest insider purchases by dollar amount
- Any notable insider selling patterns
- Insider buy/sell ratio by sector
- Stocks where insider activity diverges from price action`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Institutional Activity Prompt
 * Track institutional holdings and 13F changes.
 */
const institutionalActivityPrompt: Prompt = {
  name: "institutional-activity",
  description: "Analyze recent institutional filings, holdings changes, and sector exposure",
  arguments: [
    {
      name: "sector",
      description: "Optional sector focus (e.g., technology, healthcare)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleInstitutionalActivity(args: Record<string, string>): Promise<PromptMessage[]> {
  const sector = args.sector || ""
  const sectorFilter = sector ? ` Focus on the ${sector} sector.` : ""

  const content = `Analyze recent institutional activity:${sectorFilter}

1. Get the latest 13F filings
2. Identify the biggest position changes (new positions, exits, size changes)
3. Look for stocks where multiple institutions are building positions
4. Check which sectors institutions are rotating into/out of
5. Identify any notable institutional buyers (Berkshire, Tiger Global, etc.)

Report:
- Stocks with the most institutional buying interest
- Major position changes from prominent funds
- Sector allocation trends
- New positions initiated by multiple institutions
- Any contrarian moves (institutions buying what retail is selling)`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Sector Flow Analysis Prompt
 * Compare options flow across sector groups.
 */
const sectorFlowPrompt: Prompt = {
  name: "sector-flow",
  description: "Compare options flow sentiment across sectors or a specific sector group",
  arguments: [
    {
      name: "group",
      description: "Sector group to analyze (mag7, semi, bank, energy, etc.)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleSectorFlow(args: Record<string, string>): Promise<PromptMessage[]> {
  const group = args.group || "mag7"

  const content = `Analyze options flow for the ${group} sector group:

1. Get the greek flow (delta and vega exposure) for the ${group} group
2. Break down flow by expiration to see near-term vs longer-term positioning
3. Look at individual ticker flow within the group
4. Compare put vs call activity across the sector
5. Check dark pool activity for the same names

Provide:
- Overall sector sentiment (bullish/bearish/neutral)
- Which names within ${group} have the most bullish positioning
- Which names have the most bearish positioning
- Net delta and vega exposure for the group
- Any divergences between options flow and dark pool activity`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Greek Exposure Analysis Prompt
 * Analyze dealer gamma and delta positioning.
 */
const greekExposurePrompt: Prompt = {
  name: "greek-exposure",
  description: "Analyze gamma, delta, and vanna exposure for a ticker",
  arguments: [
    {
      name: "ticker",
      description: "Stock ticker symbol to analyze (e.g., SPY, QQQ)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handleGreekExposure(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  if (!ticker) {
    throw new Error("ticker argument is required")
  }

  const content = `Analyze greek exposure for ${ticker}:

1. Get gamma exposure (GEX) by strike price
2. Get delta exposure by strike
3. Look at vanna exposure (sensitivity to volatility changes)
4. Break down greek exposure by expiration
5. Identify key levels where dealer hedging could impact price

Explain:
- Where are the largest gamma concentrations?
- Is overall GEX positive or negative (and what that means for price action)?
- Key strike levels that could act as magnets or barriers
- How dealer positioning might affect volatility
- Critical levels where hedging flows could accelerate moves`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * IV Rank Screener Prompt
 * Find stocks with extreme IV levels.
 */
const ivRankScreenerPrompt: Prompt = {
  name: "iv-screener",
  description: "Screen for stocks with high or low IV rank for options strategies",
  arguments: [
    {
      name: "mode",
      description: "high (>70 IV rank) or low (<30 IV rank)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleIvRankScreener(args: Record<string, string>): Promise<PromptMessage[]> {
  const mode = args.mode || "both"

  const content = `Screen for stocks based on IV rank (mode: ${mode}):

1. Find stocks with IV rank above 70 (expensive options - good for selling premium)
2. Find stocks with IV rank below 30 (cheap options - good for buying premium)
3. For high IV stocks, check if there's a catalyst (earnings, FDA, etc.) explaining the elevation
4. For low IV stocks, look for any upcoming events that might cause IV expansion
5. Cross-reference with options flow to see market positioning

Provide:
- Top 10 highest IV rank stocks with context
- Top 10 lowest IV rank stocks with context
- For each, note: current IV rank, any upcoming catalysts, and recent flow sentiment
- Strategy suggestions (credit spreads for high IV, debit spreads for low IV)
- Any stocks where IV seems mispriced relative to upcoming events`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Earnings Calendar Prompt
 * Comprehensive earnings calendar with positioning.
 */
const earningsCalendarPrompt: Prompt = {
  name: "earnings-calendar",
  description: "Earnings calendar with IV levels and options positioning",
  arguments: [
    {
      name: "timeframe",
      description: "today, week, or next_week (default: week)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleEarningsCalendar(args: Record<string, string>): Promise<PromptMessage[]> {
  const timeframe = args.timeframe || "week"

  const content = `Get the earnings calendar for ${timeframe}:

1. List all earnings reports (premarket and afterhours) for ${timeframe}
2. For major names, include: IV rank, expected move, and historical earnings performance
3. Identify which earnings have unusual options positioning
4. Flag any names with notable flow leading into earnings
5. Group by day and time (premarket vs afterhours)

Format as:
- Day-by-day breakdown with AM/PM earnings
- Key metrics for each: market cap, IV rank, expected move
- Historical average earnings move for comparison
- Any notable options activity or insider trades pre-earnings
- Highlight the most anticipated reports`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * FDA Calendar Prompt
 * Track FDA events and biotech catalysts.
 */
const fdaCalendarPrompt: Prompt = {
  name: "fda-calendar",
  description: "FDA calendar with PDUFA dates and biotech options activity",
  arguments: [
    {
      name: "days",
      description: "Number of days to look ahead (default: 30)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleFdaCalendar(args: Record<string, string>): Promise<PromptMessage[]> {
  const days = args.days || "30"

  const content = `Get FDA events for the next ${days} days:

1. List all upcoming FDA events (PDUFA dates, advisory committees, etc.)
2. For each event, get the ticker, drug name, and indication
3. Check options activity for these biotech names
4. Look for unusual positioning ahead of the catalysts
5. Get IV levels to see how much move is priced in

Provide:
- Chronological list of FDA events
- For each: ticker, drug, event type, date
- Options metrics: IV rank, expected move, put/call ratio
- Any unusual options flow ahead of the events
- Historical context on similar FDA decisions if relevant`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Short Interest Analysis Prompt
 * Track short interest and squeeze potential.
 */
const shortInterestPrompt: Prompt = {
  name: "short-interest",
  description: "Analyze short interest, FTDs, and squeeze potential for a ticker",
  arguments: [
    {
      name: "ticker",
      description: "Stock ticker symbol to analyze (e.g., GME, AMC)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handleShortInterest(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  if (!ticker) {
    throw new Error("ticker argument is required")
  }

  const content = `Analyze short interest for ${ticker}:

1. Get current short interest data (shares short, percent of float)
2. Look at short interest trends over time
3. Check failure-to-deliver (FTD) data and any upcoming settlement dates
4. Get short volume ratio from recent trading
5. Compare short activity by exchange

Also check:
- Current options flow - is there bullish call activity?
- Dark pool activity - any accumulation patterns?
- Days to cover based on average volume

Assess squeeze potential:
- Short interest as % of float
- FTD trends and settlement timing
- Options positioning (gamma squeeze potential)
- Dark pool/institutional accumulation signs
- Overall risk/reward for a squeeze thesis`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Seasonality Analysis Prompt
 * Historical seasonal patterns for a ticker or market.
 */
const seasonalityPrompt: Prompt = {
  name: "seasonality",
  description: "Analyze historical seasonality patterns for a ticker or the market",
  arguments: [
    {
      name: "ticker",
      description: "Stock ticker symbol (optional - omit for market-wide)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleSeasonality(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  const target = ticker || "the overall market"

  const content = `Analyze seasonality patterns for ${target}:

1. Get historical performance by month
2. Identify the strongest and weakest months historically
3. Look at current month's typical pattern
4. ${ticker ? `Compare ${ticker}'s seasonality to its sector` : "Get top and bottom performers for the current month"}
5. Check if current positioning aligns with seasonal patterns

Provide:
- Month-by-month historical returns (average, win rate)
- Best and worst performing months
- Current month's historical tendency
- ${ticker ? "Sector comparison" : "Top 10 stocks that historically perform well this month"}
- Any divergence between current positioning and seasonal patterns
- Actionable insights based on seasonality`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * ETF Flow Analysis Prompt
 * Track ETF inflows, outflows, and holdings.
 */
const etfFlowPrompt: Prompt = {
  name: "etf-flow",
  description: "Analyze ETF inflows, outflows, and sector exposure",
  arguments: [
    {
      name: "ticker",
      description: "ETF ticker to analyze (e.g., SPY, QQQ) or stock ticker for exposure lookup",
      required: true,
    },
  ] as PromptArgument[],
}

async function handleEtfFlow(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  if (!ticker) {
    throw new Error("ticker argument is required")
  }

  const content = `Analyze ETF data for ${ticker}:

1. If ${ticker} is an ETF:
   - Get inflow/outflow data over recent periods
   - Show top holdings and sector weights
   - Check options flow on the ETF
   - Look at country/geographic exposure if relevant

2. If ${ticker} is a stock:
   - Find all ETFs that hold ${ticker}
   - Show the weight of ${ticker} in each ETF
   - Calculate potential passive flow impact
   - Identify ETFs with largest positions

Provide:
- Flow trends (is money coming in or going out?)
- Holdings breakdown or ETF exposure list
- Options positioning on the ETF
- Implications for price action based on flows`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Bullish Confluence Prompt
 * Find stocks with multiple bullish signals.
 */
const bullishConfluencePrompt: Prompt = {
  name: "bullish-confluence",
  description: "Find stocks with multiple bullish signals across flow, dark pool, and insiders",
  arguments: [] as PromptArgument[],
}

async function handleBullishConfluence(): Promise<PromptMessage[]> {
  const content = `Find stocks with bullish confluence across multiple data sources:

Look for stocks that have ALL of these characteristics:
1. Bullish options flow - more call buying than put buying, large premium call trades
2. Dark pool accumulation - large dark pool prints at or above the current price
3. Insider buying - recent insider purchases (within 90 days)
4. Reasonable IV - IV rank below 50 (options aren't overpriced)

Process:
1. Start with tickers showing bullish options flow today
2. Filter for those with positive dark pool sentiment
3. Cross-reference with recent insider buying activity
4. Check IV rank to find reasonably priced options

Provide:
- List of stocks meeting all criteria (if any)
- For each, show: options flow summary, dark pool activity, insider transactions, IV rank
- Rank by strength of confluence
- Any additional catalysts (earnings, FDA, etc.) that could drive the move`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Bearish Confluence Prompt
 * Find stocks with multiple bearish signals.
 */
const bearishConfluencePrompt: Prompt = {
  name: "bearish-confluence",
  description: "Find stocks with multiple bearish signals across flow, dark pool, and insiders",
  arguments: [] as PromptArgument[],
}

async function handleBearishConfluence(): Promise<PromptMessage[]> {
  const content = `Find stocks with bearish confluence across multiple data sources:

Look for stocks that have ALL of these characteristics:
1. Bearish options flow - heavy put buying, large premium put trades or call selling
2. Dark pool distribution - large dark pool prints below current price (distribution)
3. Insider selling - recent insider sales (within 90 days)
4. High short interest - elevated short interest as % of float

Process:
1. Start with tickers showing bearish options flow today
2. Filter for those with negative dark pool sentiment
3. Cross-reference with recent insider selling activity
4. Check short interest levels for additional confirmation

Provide:
- List of stocks meeting multiple criteria
- For each, show: options flow summary, dark pool activity, insider transactions, short interest
- Rank by strength of bearish confluence
- Any upcoming catalysts that could accelerate the downside`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Politician Portfolio Prompt
 * Deep dive on a specific politician's holdings and trades.
 */
const politicianPortfolioPrompt: Prompt = {
  name: "politician-portfolio",
  description: "Analyze a politician's portfolio holdings and recent trades",
  arguments: [
    {
      name: "name",
      description: "Politician name (e.g., Nancy Pelosi, Dan Crenshaw)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handlePoliticianPortfolio(args: Record<string, string>): Promise<PromptMessage[]> {
  const name = args.name || ""
  if (!name) {
    throw new Error("name argument is required")
  }

  const content = `Analyze the portfolio and trading activity of ${name}:

1. Get their current portfolio holdings
2. Show recent trades (purchases and sales)
3. Calculate sector exposure of their portfolio
4. Look for any patterns in their trading (timing, sectors, size)
5. Check if any of their trades preceded significant price moves

Provide:
- Current portfolio breakdown (top holdings, sector allocation)
- Recent trading activity with dates and amounts
- Any notable concentrated positions
- Historical performance of their disclosed trades
- Comparison to overall congressional trading patterns`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Weekly Expiration Analysis Prompt
 * Analyze options dynamics for weekly expiration.
 */
const weeklyExpirationPrompt: Prompt = {
  name: "weekly-expiration",
  description: "Analyze max pain, gamma, and positioning for weekly options expiration",
  arguments: [
    {
      name: "tickers",
      description: "Comma-separated tickers to analyze (default: SPY,QQQ,IWM)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleWeeklyExpiration(args: Record<string, string>): Promise<PromptMessage[]> {
  const tickers = args.tickers || "SPY,QQQ,IWM"

  const content = `Analyze weekly options expiration for ${tickers}:

For each ticker:
1. Get max pain for the nearest weekly expiration
2. Show open interest distribution by strike
3. Analyze gamma exposure at key strikes
4. Look at put/call ratio for the weekly expiration
5. Check volume and positioning changes

Provide for each ticker:
- Max pain level and distance from current price
- Key OI concentrations (strikes with highest open interest)
- Gamma levels that could cause pinning or acceleration
- Expected range based on options pricing
- Any notable positioning that could drive expiration dynamics`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Economic Calendar Prompt
 * Track upcoming economic events and market positioning.
 */
const economicCalendarPrompt: Prompt = {
  name: "economic-calendar",
  description: "Economic calendar with FOMC, CPI, jobs data and market positioning",
  arguments: [] as PromptArgument[],
}

async function handleEconomicCalendar(): Promise<PromptMessage[]> {
  const content = `Get the economic calendar and analyze market positioning:

1. Get upcoming economic events (FOMC meetings, CPI releases, jobs reports, GDP, etc.)
2. For major events, check how the market is positioned:
   - VIX/volatility levels
   - Options positioning around the event dates
   - Put/call ratios on SPY, QQQ
3. Look at historical market reactions to similar events
4. Check if there's unusual hedging activity

Provide:
- Chronological list of upcoming economic events
- Current market positioning (bullish/bearish/hedged)
- Volatility expectations around key dates
- Historical context for how markets typically react
- Any unusual options activity suggesting big moves expected`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * End of Day Recap Prompt
 * Summarize the day's market action.
 */
const endOfDayRecapPrompt: Prompt = {
  name: "end-of-day-recap",
  description: "End of day market recap with flow, dark pool, and sector summary",
  arguments: [] as PromptArgument[],
}

async function handleEndOfDayRecap(): Promise<PromptMessage[]> {
  const content = `Give me an end of day market recap:

1. How did market tide trend throughout the day? (bullish/bearish shifts)
2. What were the top tickers by net premium (biggest options bets)?
3. Summarize dark pool activity - any large institutional prints?
4. Which sectors led and which lagged?
5. Any notable news or events that drove the action?

Summarize:
- Overall market direction and key levels
- Top 5-10 tickers with the most significant options activity
- Large dark pool trades worth noting
- Sector performance and rotation
- Key themes and takeaways for tomorrow
- Any after-hours earnings to watch`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Correlation Analysis Prompt
 * Analyze correlations between tickers.
 */
const correlationAnalysisPrompt: Prompt = {
  name: "correlation-analysis",
  description: "Analyze correlations between tickers over a time period",
  arguments: [
    {
      name: "tickers",
      description: "Comma-separated tickers to analyze (e.g., NVDA,AMD,INTC)",
      required: true,
    },
    {
      name: "days",
      description: "Number of days for correlation period (default: 30)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleCorrelationAnalysis(args: Record<string, string>): Promise<PromptMessage[]> {
  const tickers = args.tickers || ""
  if (!tickers) {
    throw new Error("tickers argument is required")
  }
  const days = args.days || "30"

  const content = `Analyze correlations between ${tickers} over the past ${days} days:

1. Get correlation data between these tickers
2. Identify which pairs are most/least correlated
3. Look for any recent correlation breakdowns or changes
4. Check if one ticker tends to lead the others
5. Compare options flow sentiment across these tickers

Provide:
- Correlation matrix between the tickers
- Historical correlation trends (increasing/decreasing)
- Which ticker appears to lead price moves
- Any divergences worth noting (one moving opposite to others)
- Flow sentiment comparison - are options traders aligned or diverging?
- Trading implications based on correlations`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Top Movers Prompt
 * Find tickers with the biggest options activity.
 */
const topMoversPrompt: Prompt = {
  name: "top-movers",
  description: "Top tickers by net premium and options impact today",
  arguments: [
    {
      name: "limit",
      description: "Number of top movers to show (default: 10)",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleTopMovers(args: Record<string, string>): Promise<PromptMessage[]> {
  const limit = args.limit || "10"

  const content = `Find the top ${limit} movers by options activity today:

1. Get tickers with the highest net premium (total options dollars flowing)
2. Separate into bullish movers (call-heavy) vs bearish movers (put-heavy)
3. For each top mover, get:
   - Net premium amount
   - Dominant direction (calls vs puts)
   - Any notable individual trades
4. Check if any of these have upcoming catalysts
5. Look at dark pool activity for confirmation

Provide:
- Top ${limit} tickers ranked by absolute net premium
- For each: ticker, net premium, direction (bullish/bearish), key trades
- Any catalysts (earnings, FDA, etc.) that explain the activity
- Dark pool confirmation or divergence
- Which moves look like new positions vs hedging`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * News Scanner Prompt
 * Scan market news and related flow.
 */
const newsScannerPrompt: Prompt = {
  name: "news-scanner",
  description: "Market news headlines with related options and dark pool activity",
  arguments: [
    {
      name: "ticker",
      description: "Optional ticker to focus news on",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleNewsScanner(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  const tickerFilter = ticker ? ` Focus on ${ticker}.` : ""

  const content = `Scan market news and related trading activity:${tickerFilter}

1. Get recent market news headlines${ticker ? ` for ${ticker}` : ""}
2. For major news stories, check:
   - Options flow reaction (increased activity, direction)
   - Dark pool prints around the news
   - Price impact
3. Identify any news-driven movers
4. Look for stocks with unusual activity but no obvious news (potential leaks)

Provide:
- Key headlines and their market impact
- Tickers reacting to news with flow data
- Any unusual activity without obvious news catalysts
- Sentiment summary based on news tone
- Actionable opportunities from news-driven moves`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Option Contract Analysis Prompt
 * Deep dive on a specific option contract.
 */
const optionContractPrompt: Prompt = {
  name: "option-contract",
  description: "Deep dive analysis of a specific option contract",
  arguments: [
    {
      name: "contract",
      description: "Option contract symbol (e.g., AAPL240119C00150000)",
      required: true,
    },
  ] as PromptArgument[],
}

async function handleOptionContract(args: Record<string, string>): Promise<PromptMessage[]> {
  const contract = args.contract?.toUpperCase() || ""
  if (!contract) {
    throw new Error("contract argument is required")
  }

  const content = `Analyze the option contract ${contract}:

1. Get current contract details (strike, expiration, type, current price)
2. Show recent flow for this contract:
   - Volume vs open interest
   - Recent trades (size, price, direction)
   - Any sweeps or blocks
3. Get historical price data for the contract
4. Look at intraday trading patterns
5. Check volume profile

Provide:
- Contract specs and current pricing
- Greeks (delta, gamma, theta, vega)
- Recent flow summary (who's buying/selling)
- Volume analysis (is this contract active?)
- Historical price movement
- Assessment: is this contract being accumulated or distributed?`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Analyst Tracker Prompt
 * Track analyst ratings and related flow.
 */
const analystTrackerPrompt: Prompt = {
  name: "analyst-tracker",
  description: "Recent analyst ratings changes with options flow correlation",
  arguments: [
    {
      name: "ticker",
      description: "Optional ticker to focus on",
      required: false,
    },
  ] as PromptArgument[],
}

async function handleAnalystTracker(args: Record<string, string>): Promise<PromptMessage[]> {
  const ticker = args.ticker?.toUpperCase() || ""
  const tickerFilter = ticker ? ` for ${ticker}` : ""

  const content = `Track analyst ratings and related activity${tickerFilter}:

1. Get recent analyst ratings (upgrades, downgrades, initiations)${ticker ? ` for ${ticker}` : ""}
2. For each rating change, check:
   - Options flow before and after the rating
   - Whether flow preceded the rating (potential front-running)
   - Price reaction to the rating
3. Look for unusual options activity in names with upcoming expected ratings
4. Screen for analyst consensus changes

Provide:
- Recent analyst actions with price targets
- Flow correlation (did smart money know before the rating?)
- Stocks with options activity that might precede ratings
- Overall analyst sentiment trends
- Actionable ideas from analyst/flow alignment`

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: content,
      },
    },
  ]
}

/**
 * Array of all prompt registrations.
 */
const promptRegistrations: PromptRegistration[] = [
  { prompt: dailySummaryPrompt, handler: handleDailySummary },
  { prompt: tickerAnalysisPrompt, handler: handleTickerAnalysis },
  { prompt: congressTrackerPrompt, handler: handleCongressTracker },
  { prompt: morningBriefingPrompt, handler: handleMorningBriefing },
  { prompt: optionsSetupPrompt, handler: handleOptionsSetup },
  { prompt: preEarningsPrompt, handler: handlePreEarnings },
  { prompt: unusualFlowPrompt, handler: handleUnusualFlow },
  { prompt: darkPoolScannerPrompt, handler: handleDarkPoolScanner },
  { prompt: insiderScannerPrompt, handler: handleInsiderScanner },
  { prompt: institutionalActivityPrompt, handler: handleInstitutionalActivity },
  { prompt: sectorFlowPrompt, handler: handleSectorFlow },
  { prompt: greekExposurePrompt, handler: handleGreekExposure },
  { prompt: ivRankScreenerPrompt, handler: handleIvRankScreener },
  { prompt: earningsCalendarPrompt, handler: handleEarningsCalendar },
  { prompt: fdaCalendarPrompt, handler: handleFdaCalendar },
  { prompt: shortInterestPrompt, handler: handleShortInterest },
  { prompt: seasonalityPrompt, handler: handleSeasonality },
  { prompt: etfFlowPrompt, handler: handleEtfFlow },
  { prompt: bullishConfluencePrompt, handler: handleBullishConfluence },
  { prompt: bearishConfluencePrompt, handler: handleBearishConfluence },
  { prompt: politicianPortfolioPrompt, handler: handlePoliticianPortfolio },
  { prompt: weeklyExpirationPrompt, handler: handleWeeklyExpiration },
  { prompt: economicCalendarPrompt, handler: handleEconomicCalendar },
  { prompt: endOfDayRecapPrompt, handler: handleEndOfDayRecap },
  { prompt: correlationAnalysisPrompt, handler: handleCorrelationAnalysis },
  { prompt: topMoversPrompt, handler: handleTopMovers },
  { prompt: newsScannerPrompt, handler: handleNewsScanner },
  { prompt: optionContractPrompt, handler: handleOptionContract },
  { prompt: analystTrackerPrompt, handler: handleAnalystTracker },
]

/**
 * Export array of all prompts for ListPrompts handler.
 */
export const prompts = promptRegistrations.map((reg) => reg.prompt)

/**
 * Export object mapping prompt names to their handlers for GetPrompt handler.
 */
export const handlers: Record<string, PromptHandler> = Object.fromEntries(
  promptRegistrations.map((reg) => [reg.prompt.name, reg.handler]),
)
