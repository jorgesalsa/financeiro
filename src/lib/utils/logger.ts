import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  tenantId?: string;
  userId?: string;
  action?: string;
  module?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

const isDev = process.env.NODE_ENV !== "production";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // gray
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function formatLog(entry: LogEntry): string {
  if (isDev) {
    const color = LEVEL_COLORS[entry.level];
    const prefix = `${color}[${entry.level.toUpperCase()}]${RESET}`;
    const ctx = entry.context
      ? ` ${LEVEL_COLORS.debug}${JSON.stringify(entry.context)}${RESET}`
      : "";
    return `${prefix} ${entry.message}${ctx}`;
  }

  // Production: structured JSON for log aggregation
  return JSON.stringify({
    ...entry,
    error: entry.error
      ? { message: entry.error.message, stack: entry.error.stack }
      : undefined,
  });
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "debug":
      if (isDev) console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      // Send warnings to Sentry as breadcrumbs
      if (!isDev) {
        Sentry.addBreadcrumb({
          category: context?.module ?? "app",
          message,
          level: "warning",
          data: context,
        });
      }
      break;
    case "error":
      console.error(formatted);
      // Send errors to Sentry
      if (!isDev && error) {
        Sentry.captureException(error, {
          extra: context as Record<string, unknown>,
        });
      } else if (!isDev) {
        Sentry.captureMessage(message, {
          level: "error",
          extra: context as Record<string, unknown>,
        });
      }
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    log("debug", message, context),
  info: (message: string, context?: LogContext) =>
    log("info", message, context),
  warn: (message: string, context?: LogContext) =>
    log("warn", message, context),
  error: (message: string, context?: LogContext, error?: Error) =>
    log("error", message, context, error),
};

export default logger;
