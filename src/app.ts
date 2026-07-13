// =============================================================
// Express App Factory
// =============================================================
// แยกการ "ประกอบ app" ออกจากการ "listen" (อยู่ใน main.ts)
// เพื่อให้ integration test (supertest) import app มาทดสอบได้
// โดยไม่ต้องเปิด port จริง
//
// ลำดับ middleware สำคัญมาก:
//   1. correlationId  ← ต้องมาก่อนสุด เพื่อให้ทุกอย่างมี ID
//   2. httpLogger     ← log ทุก request พร้อม correlationId
//   3. helmet         ← security headers
//   4. cors           ← cross-origin policy
//   5. generalRateLimit
//   6. express.json() ← parse body
//   7. passport
//   8. routes
//   9. errorHandler   ← ต้องอยู่ท้ายสุดเสมอ
// =============================================================

// env ต้อง import ก่อนสุด — validate environment variables ตอน boot
import { env } from "@shared/config/env"
import express, { Request, Response } from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import passport from "passport"
import { correlationId } from "@shared/middlewares/correlation-id.middleware"
import { httpLogger } from "@shared/middlewares/http-logger.middleware"
import { generalRateLimit } from "@shared/middlewares/rate-limit.middleware"
import { errorHandler } from "@shared/middlewares/error.middleware"
import { initSentry } from "@shared/observability/sentry"
import authRouter from "@modules/auth/presentation/routes/v1/auth.route"
import organizationRouter from "@modules/organization/presentation/routes/v1/organization.route"
import invitationRouter from "@modules/organization/presentation/routes/v1/invitation.route"
import boardRouter from "@modules/board/presentation/routes/v1/board.route"
import orgCardsRouter from "@modules/board/presentation/routes/v1/org-cards.route"
import chatRouter from "@modules/chat/presentation/routes/v1/chat.route"
import notificationRouter from "@modules/notification/presentation/routes/v1/notification.route"

// เริ่ม Sentry ให้เร็วที่สุด (ก่อนประกอบ route) — ถ้าไม่มี DSN จะ no-op
initSentry()

export const app = express()

// Trust proxy — เปิดเฉพาะ production ที่รันหลัง reverse proxy (Railway/Render/ฯลฯ)
// ตั้งเป็น 1 = เชื่อ proxy ชั้นแรกชั้นเดียว เพื่อให้ rate limit อ่าน client IP จริงได้
// ไม่ตั้งเป็น true (เชื่อทุกชั้น) เพราะ client อาจปลอม X-Forwarded-For เพื่อ bypass rate limit
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1)
}

// 1. Correlation ID — ต้องมาก่อนทุก middleware เพื่อให้ log ทุกตัวมี ID
app.use(correlationId)

// 2. HTTP Logger — log ทุก request/response โดยอัตโนมัติ
app.use(httpLogger)

// 3. Security headers
app.use(helmet())

// 4. CORS
// ALLOWED_ORIGIN รองรับหลายค่าได้ คั่นด้วย comma (เช่น localhost ตอน dev + โดเมน Vercel ตอน prod)
const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
)

// 5. Rate limiting
app.use(generalRateLimit)

// 6. Parse JSON body + cookies
app.use(express.json())
// cookie-parser: อ่าน Cookie header → req.cookies (ใช้กับ refresh token httpOnly)
app.use(cookieParser())

// 7. Passport
app.use(passport.initialize())

// 8. Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Bootstrapper API is running" })
})

// Health check (liveness) — platform/uptime monitor เรียกเช็คว่าแอปยังตอบไหม
// ตอบเร็ว ไม่แตะ DB เพื่อไม่ให้ DB ช้าลากให้ health ล้มตาม (liveness ≠ readiness)
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

app.use("/api/v1/auth", authRouter)
// board/cards ต้องมาก่อน organizations: mount path เจาะจงกว่า (.../:orgId/...)
// จะรับ request ของตัวเองทั้งหมด ไม่ตกไปให้ organizationRouter รัน middleware ซ้ำ
app.use("/api/v1/organizations/:orgId/boards", boardRouter)
app.use("/api/v1/organizations/:orgId/cards", orgCardsRouter)
app.use("/api/v1/organizations/:orgId/messages", chatRouter)
app.use("/api/v1/organizations", organizationRouter)
app.use("/api/v1/invitations", invitationRouter)
app.use("/api/v1/notifications", notificationRouter)

// 9. Global error handler — ต้องลงทะเบียนเป็นตัวสุดท้ายเสมอ
app.use(errorHandler)
