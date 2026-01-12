import { describe, it, expect } from "vitest"
import {
  toJsonSchema,
  formatZodError,
  tickerSchema,
  dateSchema,
  expirySchema,
  limitSchema,
  optionTypeSchema,
  orderDirectionSchema,
  pageSchema,
  candleSizeSchema,
  deltaSchema,
} from "../../src/schemas/index.js"
import { z } from "zod"

describe("toJsonSchema", () => {
  it("converts a simple Zod schema to JSON Schema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    })

    const result = toJsonSchema(schema)

    expect(result.type).toBe("object")
    expect(result.properties).toBeDefined()
    expect(result.properties.name).toBeDefined()
    expect(result.properties.age).toBeDefined()
  })

  it("removes $schema property from output", () => {
    const schema = z.object({
      test: z.string(),
    })

    const result = toJsonSchema(schema) as Record<string, unknown>

    expect(result.$schema).toBeUndefined()
  })

  it("includes required array", () => {
    const schema = z.object({
      required_field: z.string(),
      optional_field: z.string().optional(),
    })

    const result = toJsonSchema(schema)

    expect(result.required).toBeDefined()
    expect(result.required).toContain("required_field")
  })
})

describe("formatZodError", () => {
  it("formats a single validation error", () => {
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
    })

    const result = schema.safeParse({ name: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted).toBe("Name is required")
    }
  })

  it("formats multiple validation errors with comma separation", () => {
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      age: z.number().positive("Age must be positive"),
    })

    const result = schema.safeParse({ name: "", age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted).toContain("Name is required")
      expect(formatted).toContain("Age must be positive")
      expect(formatted).toContain(", ")
    }
  })
})

describe("tickerSchema", () => {
  it("accepts valid ticker symbols", () => {
    expect(tickerSchema.parse("AAPL")).toBe("AAPL")
    expect(tickerSchema.parse("MSFT")).toBe("MSFT")
    expect(tickerSchema.parse("A")).toBe("A")
    expect(tickerSchema.parse("BRK.B")).toBe("BRK.B")
  })

  it("rejects empty string", () => {
    expect(() => tickerSchema.parse("")).toThrow()
  })

  it("rejects string longer than 10 characters", () => {
    expect(() => tickerSchema.parse("TOOLONGTICKE")).toThrow()
  })
})

describe("dateSchema", () => {
  it("accepts valid YYYY-MM-DD format", () => {
    expect(dateSchema.parse("2024-01-15")).toBe("2024-01-15")
    expect(dateSchema.parse("2023-12-31")).toBe("2023-12-31")
  })

  it("rejects invalid date formats", () => {
    expect(() => dateSchema.parse("2024/01/15")).toThrow()
    expect(() => dateSchema.parse("01-15-2024")).toThrow()
    expect(() => dateSchema.parse("2024-1-15")).toThrow()
    expect(() => dateSchema.parse("2024-01-5")).toThrow()
    expect(() => dateSchema.parse("not-a-date")).toThrow()
  })
})

describe("expirySchema", () => {
  it("accepts valid expiry dates", () => {
    expect(expirySchema.parse("2024-01-19")).toBe("2024-01-19")
    expect(expirySchema.parse("2025-06-20")).toBe("2025-06-20")
  })

  it("rejects invalid formats", () => {
    expect(() => expirySchema.parse("Jan 19, 2024")).toThrow()
    expect(() => expirySchema.parse("20240119")).toThrow()
  })
})

describe("limitSchema", () => {
  it("accepts positive integers within range", () => {
    expect(limitSchema.parse(1)).toBe(1)
    expect(limitSchema.parse(100)).toBe(100)
    expect(limitSchema.parse(500)).toBe(500)
  })

  it("rejects zero", () => {
    expect(() => limitSchema.parse(0)).toThrow()
  })

  it("rejects negative numbers", () => {
    expect(() => limitSchema.parse(-1)).toThrow()
    expect(() => limitSchema.parse(-100)).toThrow()
  })

  it("rejects non-integers", () => {
    expect(() => limitSchema.parse(1.5)).toThrow()
    expect(() => limitSchema.parse(10.1)).toThrow()
  })

  it("rejects values exceeding maximum", () => {
    expect(() => limitSchema.parse(501)).toThrow()
    expect(() => limitSchema.parse(1000)).toThrow()
  })
})

describe("optionTypeSchema", () => {
  it("accepts call and put", () => {
    expect(optionTypeSchema.parse("call")).toBe("call")
    expect(optionTypeSchema.parse("put")).toBe("put")
  })

  it("rejects invalid option types", () => {
    expect(() => optionTypeSchema.parse("CALL")).toThrow()
    expect(() => optionTypeSchema.parse("PUT")).toThrow()
    expect(() => optionTypeSchema.parse("other")).toThrow()
  })
})

describe("orderDirectionSchema", () => {
  it("accepts asc and desc", () => {
    expect(orderDirectionSchema.parse("asc")).toBe("asc")
    expect(orderDirectionSchema.parse("desc")).toBe("desc")
  })

  it("rejects invalid order direction values", () => {
    expect(() => orderDirectionSchema.parse("ASC")).toThrow()
    expect(() => orderDirectionSchema.parse("ascending")).toThrow()
  })
})

describe("pageSchema", () => {
  it("accepts positive integers", () => {
    expect(pageSchema.parse(1)).toBe(1)
    expect(pageSchema.parse(5)).toBe(5)
    expect(pageSchema.parse(100)).toBe(100)
  })

  it("rejects zero", () => {
    expect(() => pageSchema.parse(0)).toThrow()
  })

  it("rejects negative numbers", () => {
    expect(() => pageSchema.parse(-1)).toThrow()
  })

  it("rejects non-integers", () => {
    expect(() => pageSchema.parse(1.5)).toThrow()
  })
})

describe("candleSizeSchema", () => {
  it("accepts valid candle sizes", () => {
    expect(candleSizeSchema.parse("1m")).toBe("1m")
    expect(candleSizeSchema.parse("5m")).toBe("5m")
    expect(candleSizeSchema.parse("15m")).toBe("15m")
    expect(candleSizeSchema.parse("1h")).toBe("1h")
    expect(candleSizeSchema.parse("4h")).toBe("4h")
    expect(candleSizeSchema.parse("1d")).toBe("1d")
  })

  it("rejects invalid candle sizes", () => {
    expect(() => candleSizeSchema.parse("2m")).toThrow()
    expect(() => candleSizeSchema.parse("1w")).toThrow()
    expect(() => candleSizeSchema.parse("daily")).toThrow()
  })
})

describe("deltaSchema", () => {
  it("accepts valid delta values", () => {
    expect(deltaSchema.parse("10")).toBe("10")
    expect(deltaSchema.parse("25")).toBe("25")
  })

  it("rejects invalid delta values", () => {
    expect(() => deltaSchema.parse("15")).toThrow()
    expect(() => deltaSchema.parse("50")).toThrow()
    expect(() => deltaSchema.parse(10)).toThrow()
  })
})
