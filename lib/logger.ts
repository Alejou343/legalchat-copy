import fs from "fs";
import { createLogger, format, transports, config } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const isServerless = process.env.NEXT_RUNTIME === "edge" || process.env.VERCEL === "1";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  verbose: "cyan",
  debug: "blue",
  silly: "gray",
};

config.addColors(colors);

const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.colorize({ all: true }),
  format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

if (!isServerless && !fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

/**
 * Logger configuration using Winston with support for console output and daily rotated log files.
 *
 * Features:
 * 1. Detects if running in a serverless environment (e.g., Vercel Edge Functions or Vercel platform).
 *    - In serverless mode, file logging is disabled because the environment is typically read-only.
 *
 * 2. Defines custom log levels and associated colors:
 *    - error (0, red)
 *    - warn (1, yellow)
 *    - info (2, green)
 *    - http (3, magenta)
 *    - verbose (4, cyan)
 *    - debug (5, blue)
 *    - silly (6, gray)
 *
 * 3. Uses a combined log format including:
 *    - Timestamp in "YYYY-MM-DD HH:mm:ss" format
 *    - Colorized output for console readability
 *    - Custom printf format: `[timestamp] [level]: message`
 *
 * 4. Creates a local `logs` directory if it doesn't exist and if not running in serverless mode.
 *
 * 5. Creates the Winston logger with:
 *    - Console transport (logs all levels down to 'silly')
 *    - Daily rotated file transports for:
 *      - Application logs (info and above) saved as `logs/application-YYYY-MM-DD.log`
 *      - Error logs (error level) saved as `logs/error-YYYY-MM-DD.log`
 *    - File logs are compressed, limited to 20MB per file, and retained for 14 or 30 days respectively.
 *
 * Usage:
 * Import and use this logger to log messages with appropriate levels, e.g.:
 *   logger.info("Server started");
 *   logger.error("Unexpected error");
 */

const logger = createLogger({
  levels,
  format: logFormat,
  transports: [
    new transports.Console({ level: "silly" }),

    ...(!isServerless
      ? [
          new DailyRotateFile({
            level: "info",
            filename: "logs/application-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
          }),
          new DailyRotateFile({
            level: "error",
            filename: "logs/error-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "30d",
          }),
        ]
      : []),
  ],
});

export default logger;
