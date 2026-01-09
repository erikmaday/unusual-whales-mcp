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
 * Array of all prompt registrations.
 */
const promptRegistrations: PromptRegistration[] = [
  { prompt: dailySummaryPrompt, handler: handleDailySummary },
  { prompt: tickerAnalysisPrompt, handler: handleTickerAnalysis },
  { prompt: congressTrackerPrompt, handler: handleCongressTracker },
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
