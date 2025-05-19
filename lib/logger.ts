import fs from "fs";
import { createLogger, format, transports, config } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// 1. Detectar si estás en un entorno serverless (ej. Vercel)
const isServerless = process.env.NEXT_RUNTIME === "edge" || process.env.VERCEL === "1";

// 2. Definir niveles y colores
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

// 3. Formato del log
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.colorize({ all: true }),
  format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// 4. Crear carpeta 'logs' si no estás en entorno serverless y no existe
if (!isServerless && !fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

// 5. Crear logger con transporte condicional
const logger = createLogger({
  levels,
  format: logFormat,
  transports: [
    new transports.Console({ level: "silly" }),

    // Agregar archivos rotativos solo si NO estás en un entorno de solo lectura
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
