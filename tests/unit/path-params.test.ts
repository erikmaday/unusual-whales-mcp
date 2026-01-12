import { describe, it, expect } from "vitest"
import { PathParamBuilder, encodePath } from "../../src/utils/path-params.js"

describe("PathParamBuilder", () => {
  describe("add", () => {
    it("adds a required parameter", () => {
      const builder = new PathParamBuilder()
      const result = builder.add("ticker", "AAPL")

      expect(result).toBe(builder) // Returns this for chaining
      expect(builder.build("{ticker}")).toBe("AAPL")
    })

    it("adds multiple parameters via chaining", () => {
      const path = new PathParamBuilder()
        .add("ticker", "AAPL")
        .add("expiry", "2024-01-19")
        .build("/api/stock/{ticker}/greek-flow/{expiry}")

      expect(path).toBe("/api/stock/AAPL/greek-flow/2024-01-19")
    })

    it("throws when required parameter is undefined", () => {
      const builder = new PathParamBuilder()

      expect(() => builder.add("ticker", undefined)).toThrow("ticker is required")
    })

    it("throws when required parameter is null", () => {
      const builder = new PathParamBuilder()

      expect(() => builder.add("ticker", null)).toThrow("ticker is required")
    })

    it("skips optional parameter when undefined", () => {
      const builder = new PathParamBuilder()
      const result = builder.add("optional", undefined, false)

      expect(result).toBe(builder)
    })

    it("skips optional parameter when null", () => {
      const builder = new PathParamBuilder()
      const result = builder.add("optional", null, false)

      expect(result).toBe(builder)
    })

    it("adds optional parameter when value is provided", () => {
      const path = new PathParamBuilder()
        .add("ticker", "AAPL")
        .add("date", "2024-01-19", false)
        .build("/api/{ticker}/{date}")

      expect(path).toBe("/api/AAPL/2024-01-19")
    })

    it("throws when value contains forward slash", () => {
      const builder = new PathParamBuilder()

      expect(() => builder.add("ticker", "AA/PL")).toThrow("Invalid ticker: contains path characters")
    })

    it("throws when value contains backslash", () => {
      const builder = new PathParamBuilder()

      expect(() => builder.add("ticker", "AA\\PL")).toThrow("Invalid ticker: contains path characters")
    })

    it("throws when value contains path traversal", () => {
      const builder = new PathParamBuilder()

      expect(() => builder.add("ticker", "..")).toThrow("Invalid ticker: contains path characters")
      expect(() => builder.add("ticker", "foo..bar")).toThrow("Invalid ticker: contains path characters")
    })

    it("throws when value is empty string", () => {
      const builder = new PathParamBuilder()

      expect(() => builder.add("ticker", "")).toThrow("ticker cannot be empty")
    })

    it("encodes special characters", () => {
      const path = new PathParamBuilder()
        .add("ticker", "AAPL 2024")
        .build("/api/{ticker}")

      expect(path).toBe("/api/AAPL%202024")
    })

    it("converts numbers to strings", () => {
      const path = new PathParamBuilder()
        .add("id", 12345)
        .build("/api/{id}")

      expect(path).toBe("/api/12345")
    })

    it("converts booleans to strings", () => {
      const path = new PathParamBuilder()
        .add("flag", true)
        .build("/api/{flag}")

      expect(path).toBe("/api/true")
    })
  })

  describe("build", () => {
    it("replaces single placeholder", () => {
      const path = new PathParamBuilder()
        .add("ticker", "AAPL")
        .build("/api/stock/{ticker}/info")

      expect(path).toBe("/api/stock/AAPL/info")
    })

    it("replaces multiple placeholders", () => {
      const path = new PathParamBuilder()
        .add("ticker", "AAPL")
        .add("expiry", "2024-01-19")
        .add("strike", "150")
        .build("/api/{ticker}/options/{expiry}/{strike}")

      expect(path).toBe("/api/AAPL/options/2024-01-19/150")
    })

    it("handles template with no placeholders", () => {
      const path = new PathParamBuilder()
        .build("/api/market/tide")

      expect(path).toBe("/api/market/tide")
    })

    it("throws when placeholder has no matching parameter", () => {
      const builder = new PathParamBuilder()
        .add("ticker", "AAPL")

      expect(() => builder.build("/api/{ticker}/{expiry}")).toThrow("Missing required parameter: expiry")
    })

    it("replaces same placeholder multiple times", () => {
      const path = new PathParamBuilder()
        .add("ticker", "AAPL")
        .build("/api/{ticker}/compare/{ticker}")

      expect(path).toBe("/api/AAPL/compare/AAPL")
    })
  })

  describe("clear", () => {
    it("clears all parameters", () => {
      const builder = new PathParamBuilder()
        .add("ticker", "AAPL")
        .add("expiry", "2024-01-19")

      const result = builder.clear()

      expect(result).toBe(builder) // Returns this for chaining
      expect(() => builder.build("{ticker}")).toThrow("Missing required parameter: ticker")
    })

    it("allows reuse after clearing", () => {
      const builder = new PathParamBuilder()
        .add("ticker", "AAPL")

      builder.clear()
      builder.add("ticker", "MSFT")

      expect(builder.build("{ticker}")).toBe("MSFT")
    })
  })
})

describe("encodePath", () => {
  it("encodes a simple string", () => {
    expect(encodePath("AAPL")).toBe("AAPL")
  })

  it("encodes special characters", () => {
    expect(encodePath("AAPL 2024")).toBe("AAPL%202024")
    expect(encodePath("foo&bar")).toBe("foo%26bar")
    expect(encodePath("test=value")).toBe("test%3Dvalue")
  })

  it("throws when value is undefined", () => {
    expect(() => encodePath(undefined)).toThrow("Path parameter is required")
  })

  it("throws when value is null", () => {
    expect(() => encodePath(null)).toThrow("Path parameter is required")
  })

  it("throws when value contains forward slash", () => {
    expect(() => encodePath("foo/bar")).toThrow("Invalid path parameter")
  })

  it("throws when value contains backslash", () => {
    expect(() => encodePath("foo\\bar")).toThrow("Invalid path parameter")
  })

  it("throws when value contains path traversal", () => {
    expect(() => encodePath("..")).toThrow("Invalid path parameter")
    expect(() => encodePath("foo..bar")).toThrow("Invalid path parameter")
  })

  it("converts numbers to strings", () => {
    expect(encodePath(12345)).toBe("12345")
  })

  it("converts booleans to strings", () => {
    expect(encodePath(true)).toBe("true")
    expect(encodePath(false)).toBe("false")
  })

  it("handles zero", () => {
    expect(encodePath(0)).toBe("0")
  })
})
