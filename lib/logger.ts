import DailyRotateFile from "winston-daily-rotate-file";
import { createLogger, format, transports, config } from "winston";

// Define logging levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
};

// Define colors for each level
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

// Configure log format
const logFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.colorize({ all: true }),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Configure logger for each report
const logger = createLogger({
    levels,
    format: logFormat,
    transports: [
        // Development mode
        new transports.Console({
            level: "silly",
        }),
        // Log file daily rotation
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
    ],
});

export default logger;
