type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || "info"

function serializeError(err: Error): Record<string, unknown> {
  return { message: err.message, stack: err.stack, name: err.name }
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return

  const serializedData = data
    ? Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value instanceof Error ? serializeError(value) : value,
        ])
      )
    : undefined

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializedData,
  }
  process.stderr.write(JSON.stringify(entry) + "\n")
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
}
