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

// ใช้ pino-pretty (log สวยตอน dev) "ก็ต่อเมื่อ" 2 เงื่อนไขครบ:
//   1. ไม่ใช่ production
//   2. pino-pretty ถูกติดตั้งไว้จริง (เป็น devDependency — prod image ตัดทิ้ง)
// ถ้าไม่ครบ → คืน undefined = JSON ล้วน (ไม่ crash แม้ NODE_ENV ตั้งพลาด)
function prettyTransport() {
  if (env.NODE_ENV === "production") return undefined
  try {
    require.resolve("pino-pretty")
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname", // ซ่อน field ที่ไม่จำเป็นใน dev
      },
    }
  } catch {
    return undefined // ไม่ได้ติดตั้ง pino-pretty → JSON ล้วน
  }
}

export const logger = pino({
  level: env.LOG_LEVEL,

  // ติดไปกับทุก log → ใช้ filter ใน aggregator ได้ เช่น service="bootstrapper-api" env="production"
  // (เวลามีหลายแอปส่ง log ไปที่เดียวกัน จะแยกได้ว่าอันไหนของใคร)
  base: { service: "bootstrapper-api", env: env.NODE_ENV },

  // ป้องกันข้อมูลอ่อนไหวหลุดเข้า log (defense in depth)
  // ถ้าวันหนึ่งมีคนเผลอ log object ที่มี field พวกนี้ Pino จะแทนค่าด้วย [Redacted]
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[Redacted]",
  },

  transport: prettyTransport(),
})
