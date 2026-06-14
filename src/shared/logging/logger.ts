// =============================================================
// Pino Logger
// =============================================================
// Pino คือ JSON logger ที่เร็วที่สุดใน Node.js ecosystem
//
// ทำไม JSON logs?
// - Log aggregator (Datadog, Grafana Loki, CloudWatch) parse JSON ได้เลย
// - Filter/search logs ด้วย field ได้ เช่น level="error" userId="123"
// - เก็บ context ได้มากกว่า plain text
//
// สองโหมด:
//   development → pino-pretty (อ่านง่าย มีสี)
//   production  → JSON ล้วน (เร็ว, เครื่องอ่าน)
// =============================================================

import pino from "pino"
import { env } from "@shared/config/env"

const isDev = env.NODE_ENV !== "production"

export const logger = pino({
  level: env.LOG_LEVEL,

  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname", // ซ่อน field ที่ไม่จำเป็นใน dev
        },
      }
    : undefined, // production ใช้ JSON ล้วนโดยไม่มี transform
})
