type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

const currentLevel = (): LogLevel => {
  const level = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined;
  return LOG_LEVELS.includes(level ?? "info") ? level! : "info";
};

const shouldLog = (level: LogLevel) =>
  LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLevel());

const formatMessage = (level: LogLevel, message: string) => {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  debug(message: string, ...args: unknown[]) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message), ...args);
    }
  },
  info(message: string, ...args: unknown[]) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message), ...args);
    }
  },
  warn(message: string, ...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message), ...args);
    }
  },
  error(message: string, ...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message), ...args);
    }
  },
} as const;
