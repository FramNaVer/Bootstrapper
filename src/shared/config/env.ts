// =============================================================
// Environment Validation
// =============================================================
// ตรวจ environment variables "ครั้งเดียวตอน boot" ด้วย Zod
//
// ทำไมต้องมีไฟล์นี้?
// - เดิมเราเขียน process.env.JWT_SECRET! กระจายทั้งโปรเจค
//   เครื่องหมาย ! แค่ปิดปาก TypeScript แต่ถ้า env ไม่มีจริง
//   แอปจะพังตอน user คนแรกยิง request (debug ยาก)
// - ไฟล์นี้บังคับให้ "fail fast": ถ้า config ไม่ครบ แอปตายตั้งแต่ start
//   พร้อมข้อความบอกชัดว่าตัวไหนขาด
// - ที่อื่นในโปรเจค import { env } มาใช้ได้แบบ type-safe ไม่ต้องใส่ ! อีก
// =============================================================

import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default("info"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // JWT — แนะนำใช้ secret สุ่มยาว 32+ ตัวอักษร
  // สร้างได้ด้วย: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),

  // CORS
  ALLOWED_ORIGIN: z.string().default("http://localhost:3000"),

  // Sentry (error tracking) — optional: ไม่ใส่ = ปิด Sentry (dev ไม่ต้องตั้งก็ได้)
  // ตั้งค่าใน dashboard ของ host ตอน production เท่านั้น
  SENTRY_DSN: z.string().optional(),

  // Base URL ของแอป — ใช้ประกอบลิงก์ใน email (verify / reset password)
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Email (SMTP) — ถ้าไม่ตั้งค่า dev จะส่งแบบ log preview ออก console แทน
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("Bootstrapper <no-reply@bootstrapper.local>"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_CALLBACK_URL: z.string().url("GOOGLE_CALLBACK_URL must be a valid URL"),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  GITHUB_CALLBACK_URL: z.string().url("GITHUB_CALLBACK_URL must be a valid URL"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")

  // ใช้ console.error เพราะ logger ก็อ่าน env เหมือนกัน และเราต้องตายทันที
  // ก่อนที่ส่วนอื่นจะทำงาน — แสดงทุก field ที่ผิดพร้อมกัน ไม่ใช่ทีละตัว
  console.error(`\n Invalid environment variables:\n${issues}\n`)
  process.exit(1)
}

export const env = parsed.data
