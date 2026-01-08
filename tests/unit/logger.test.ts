import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("logger", () => {
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>
  const originalEnv = process.env

  beforeEach(() => {
    stderrWriteSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    vi.resetModules()
  })

  afterEach(() => {
    stderrWriteSpy.mockRestore()
    process.env = originalEnv
  })

  async function importLogger() {
    const module = await import("../../src/logger.js")
    return module.logger
  }

  it("logs info messages to stderr", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    logger.info("Test message")

    expect(stderrWriteSpy).toHaveBeenCalled()
    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)

    expect(parsed.level).toBe("info")
    expect(parsed.message).toBe("Test message")
    expect(parsed.timestamp).toBeDefined()
  })

  it("logs with additional data", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    logger.info("Test with data", { key: "value", count: 42 })

    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)

    expect(parsed.key).toBe("value")
    expect(parsed.count).toBe(42)
  })

  it("logs error messages", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    logger.error("Error occurred")

    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)

    expect(parsed.level).toBe("error")
    expect(parsed.message).toBe("Error occurred")
  })

  it("logs warn messages", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    logger.warn("Warning message")

    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)

    expect(parsed.level).toBe("warn")
    expect(parsed.message).toBe("Warning message")
  })

  it("serializes Error objects in data", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    const testError = new Error("Test error message")
    testError.name = "TestError"

    logger.error("Error log", { error: testError })

    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)

    expect(parsed.error.message).toBe("Test error message")
    expect(parsed.error.name).toBe("TestError")
    expect(parsed.error.stack).toBeDefined()
  })

  it("respects LOG_LEVEL=error and suppresses info", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "error" }
    const logger = await importLogger()

    logger.info("This should not appear")

    expect(stderrWriteSpy).not.toHaveBeenCalled()
  })

  it("respects LOG_LEVEL=error and allows error", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "error" }
    const logger = await importLogger()

    logger.error("This should appear")

    expect(stderrWriteSpy).toHaveBeenCalled()
    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)
    expect(parsed.level).toBe("error")
  })

  it("respects LOG_LEVEL=warn and suppresses info", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "warn" }
    const logger = await importLogger()

    logger.info("This should not appear")

    expect(stderrWriteSpy).not.toHaveBeenCalled()
  })

  it("respects LOG_LEVEL=warn and allows warn and error", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "warn" }
    const logger = await importLogger()

    logger.warn("Warning")
    logger.error("Error")

    expect(stderrWriteSpy).toHaveBeenCalledTimes(2)
  })

  it("logs debug when LOG_LEVEL=debug", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "debug" }
    const logger = await importLogger()

    logger.debug("Debug message")

    expect(stderrWriteSpy).toHaveBeenCalled()
    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)
    expect(parsed.level).toBe("debug")
  })

  it("suppresses debug when LOG_LEVEL=info", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    logger.debug("This should not appear")

    expect(stderrWriteSpy).not.toHaveBeenCalled()
  })

  it("defaults to info level when LOG_LEVEL not set", async () => {
    delete process.env.LOG_LEVEL
    const logger = await importLogger()

    logger.info("This should appear")
    logger.debug("This should not appear")

    expect(stderrWriteSpy).toHaveBeenCalledTimes(1)
    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)
    expect(parsed.level).toBe("info")
  })

  it("outputs newline-terminated JSON", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    logger.info("Test")

    const output = stderrWriteSpy.mock.calls[0][0] as string
    expect(output.endsWith("\n")).toBe(true)
  })

  it("outputs valid JSON timestamp in ISO format", async () => {
    process.env = { ...originalEnv, LOG_LEVEL: "info" }
    const logger = await importLogger()

    const before = new Date().toISOString()
    logger.info("Test")
    const after = new Date().toISOString()

    const output = stderrWriteSpy.mock.calls[0][0]
    const parsed = JSON.parse(output as string)

    const timestamp = new Date(parsed.timestamp)
    expect(timestamp.toISOString()).toBe(parsed.timestamp)
    expect(new Date(parsed.timestamp) >= new Date(before)).toBe(true)
    expect(new Date(parsed.timestamp) <= new Date(after)).toBe(true)
  })
})
