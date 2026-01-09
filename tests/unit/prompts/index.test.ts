import { describe, it, expect } from "vitest"
import { prompts, handlers } from "../../../src/prompts/index.js"

describe("prompts", () => {
  it("exports array of prompt definitions", () => {
    expect(Array.isArray(prompts)).toBe(true)
    expect(prompts.length).toBeGreaterThan(0)
  })

  it("includes daily-summary prompt", () => {
    const dailySummary = prompts.find((p) => p.name === "daily-summary")
    expect(dailySummary).toBeDefined()
    expect(dailySummary?.description).toContain("daily market summary")
    expect(dailySummary?.arguments).toBeDefined()
    expect(dailySummary?.arguments?.length).toBe(1)
    expect(dailySummary?.arguments?.[0].name).toBe("date")
    expect(dailySummary?.arguments?.[0].required).toBe(false)
  })

  it("includes ticker-analysis prompt", () => {
    const tickerAnalysis = prompts.find((p) => p.name === "ticker-analysis")
    expect(tickerAnalysis).toBeDefined()
    expect(tickerAnalysis?.description).toContain("single ticker")
    expect(tickerAnalysis?.arguments).toBeDefined()
    expect(tickerAnalysis?.arguments?.length).toBe(1)
    expect(tickerAnalysis?.arguments?.[0].name).toBe("ticker")
    expect(tickerAnalysis?.arguments?.[0].required).toBe(true)
  })

  it("includes congress-tracker prompt", () => {
    const congressTracker = prompts.find((p) => p.name === "congress-tracker")
    expect(congressTracker).toBeDefined()
    expect(congressTracker?.description).toContain("congressional trading")
    expect(congressTracker?.arguments).toBeDefined()
    expect(congressTracker?.arguments?.length).toBe(2)
    expect(congressTracker?.arguments?.[0].name).toBe("days")
    expect(congressTracker?.arguments?.[0].required).toBe(false)
    expect(congressTracker?.arguments?.[1].name).toBe("min_amount")
    expect(congressTracker?.arguments?.[1].required).toBe(false)
  })

  it("all prompts have required fields", () => {
    prompts.forEach((prompt) => {
      expect(prompt.name).toBeTruthy()
      expect(typeof prompt.name).toBe("string")
      expect(prompt.description).toBeTruthy()
      expect(typeof prompt.description).toBe("string")
      expect(Array.isArray(prompt.arguments)).toBe(true)
    })
  })
})

describe("handlers", () => {
  it("exports object with handler functions", () => {
    expect(typeof handlers).toBe("object")
    expect(Object.keys(handlers).length).toBeGreaterThan(0)
  })

  it("includes handler for each prompt", () => {
    prompts.forEach((prompt) => {
      expect(handlers[prompt.name]).toBeDefined()
      expect(typeof handlers[prompt.name]).toBe("function")
    })
  })

  describe("daily-summary handler", () => {
    it("returns messages array with default date", async () => {
      const result = await handlers["daily-summary"]({})
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(result[0].role).toBe("user")
      expect(result[0].content.type).toBe("text")
      expect(result[0].content.text).toContain("today")
      expect(result[0].content.text).toContain("market tide")
      expect(result[0].content.text).toContain("options flow")
      expect(result[0].content.text).toContain("dark pool")
    })

    it("uses provided date argument", async () => {
      const result = await handlers["daily-summary"]({ date: "2024-01-15" })
      expect(result[0].content.text).toContain("2024-01-15")
    })

    it("generates comprehensive analysis prompt", async () => {
      const result = await handlers["daily-summary"]({})
      const content = result[0].content.text

      expect(content).toContain("market tide")
      expect(content).toContain("sector tide")
      expect(content).toContain("unusual options flow")
      expect(content).toContain("dark pool")
      expect(content).toContain("correlations")
      expect(content).toContain("key themes")
    })
  })

  describe("ticker-analysis handler", () => {
    it("throws error when ticker is missing", async () => {
      await expect(handlers["ticker-analysis"]({})).rejects.toThrow("ticker argument is required")
    })

    it("returns messages array with ticker", async () => {
      const result = await handlers["ticker-analysis"]({ ticker: "AAPL" })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(result[0].role).toBe("user")
      expect(result[0].content.type).toBe("text")
      expect(result[0].content.text).toContain("AAPL")
    })

    it("converts ticker to uppercase", async () => {
      const result = await handlers["ticker-analysis"]({ ticker: "tsla" })
      expect(result[0].content.text).toContain("TSLA")
      expect(result[0].content.text).not.toContain("tsla")
    })

    it("generates comprehensive ticker analysis prompt", async () => {
      const result = await handlers["ticker-analysis"]({ ticker: "NVDA" })
      const content = result[0].content.text

      expect(content).toContain("NVDA")
      expect(content).toContain("stock information")
      expect(content).toContain("options flow")
      expect(content).toContain("dark pool")
      expect(content).toContain("insider trading")
      expect(content).toContain("earnings")
      expect(content).toContain("FDA events")
      expect(content).toContain("analyst ratings")
    })

    it("includes all analysis sections", async () => {
      const result = await handlers["ticker-analysis"]({ ticker: "MSFT" })
      const content = result[0].content.text

      // Check for numbered analysis steps
      expect(content).toMatch(/1\.\s+Get stock information/)
      expect(content).toMatch(/2\.\s+Analyze recent options flow/)
      expect(content).toMatch(/3\.\s+Review dark pool/)
      expect(content).toMatch(/4\.\s+Check insider trading/)
      expect(content).toMatch(/5\.\s+Look at any upcoming/)

      // Check for summary sections
      expect(content).toContain("Current stock position")
      expect(content).toContain("Options market sentiment")
      expect(content).toContain("Dark pool institutional activity")
      expect(content).toContain("Insider confidence")
      expect(content).toContain("Upcoming catalysts")
    })
  })

  describe("congress-tracker handler", () => {
    it("returns messages array with default values", async () => {
      const result = await handlers["congress-tracker"]({})
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(result[0].role).toBe("user")
      expect(result[0].content.type).toBe("text")
      expect(result[0].content.text).toContain("7 days")
      expect(result[0].content.text).toContain("$15000")
    })

    it("uses provided days argument", async () => {
      const result = await handlers["congress-tracker"]({ days: "30" })
      expect(result[0].content.text).toContain("30 days")
    })

    it("uses provided min_amount argument", async () => {
      const result = await handlers["congress-tracker"]({ min_amount: "100000" })
      expect(result[0].content.text).toContain("$100000")
    })

    it("uses both custom arguments", async () => {
      const result = await handlers["congress-tracker"]({ days: "14", min_amount: "50000" })
      const content = result[0].content.text
      expect(content).toContain("14 days")
      expect(content).toContain("$50000")
    })

    it("generates comprehensive congressional analysis prompt", async () => {
      const result = await handlers["congress-tracker"]({})
      const content = result[0].content.text

      expect(content).toContain("congressional trades")
      expect(content).toContain("significant transactions")
      expect(content.toLowerCase()).toContain("most active traders")
      expect(content.toLowerCase()).toContain("most traded tickers")
      expect(content).toContain("Sectors")
      expect(content).toContain("Buying vs selling")
      expect(content).toContain("late-filed reports")
    })

    it("includes grouping and pattern analysis", async () => {
      const result = await handlers["congress-tracker"]({})
      const content = result[0].content.text

      expect(content).toContain("Group trades by")
      expect(content).toContain("Identify any clusters or patterns")
      expect(content).toContain("Multiple members trading the same ticker")
      expect(content).toContain("Unusual timing")
      expect(content).toContain("Large purchases or sales")
    })

    it("includes summary requirements", async () => {
      const result = await handlers["congress-tracker"]({})
      const content = result[0].content.text

      expect(content).toContain("Top traded tickers")
      expect(content).toContain("Most active congressional traders")
      expect(content).toContain("Notable large transactions")
      expect(content).toContain("Sector preferences")
      expect(content).toContain("red flags")
    })
  })
})

describe("prompt handler integration", () => {
  it("all handlers return valid message structure", async () => {
    for (const [name, handler] of Object.entries(handlers)) {
      // Use appropriate args for each handler
      const args = name === "ticker-analysis" ? { ticker: "TEST" } : {}

      const result = await handler(args)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      result.forEach((message) => {
        expect(message.role).toBe("user")
        expect(message.content).toBeDefined()
        expect(message.content.type).toBe("text")
        expect(typeof message.content.text).toBe("string")
        expect(message.content.text.length).toBeGreaterThan(0)
      })
    }
  })

  it("handlers generate unique content", async () => {
    const dailySummaryResult = await handlers["daily-summary"]({})
    const tickerResult = await handlers["ticker-analysis"]({ ticker: "AAPL" })
    const congressResult = await handlers["congress-tracker"]({})

    const dailyContent = dailySummaryResult[0].content.text
    const tickerContent = tickerResult[0].content.text
    const congressContent = congressResult[0].content.text

    // Each prompt should have unique content
    expect(dailyContent).not.toBe(tickerContent)
    expect(dailyContent).not.toBe(congressContent)
    expect(tickerContent).not.toBe(congressContent)

    // Check for prompt-specific keywords
    expect(dailyContent).toContain("market tide")
    expect(tickerContent).toContain("AAPL")
    expect(congressContent).toContain("congressional")
  })
})
