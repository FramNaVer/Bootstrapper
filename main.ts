// =============================================================
// Application Entry Point
// =============================================================
// ลำดับ middleware สำคัญมาก:
//
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
// ถ้า config ไม่ครบ แอปจะตายทันทีที่นี่ ก่อนที่ส่วนอื่นจะทำงาน
import { env } from "@shared/config/env"
import express, { Request, Response } from "express"
import helmet from "helmet"
import cors from "cors"
import passport from "passport"
import { correlationId } from "@shared/middlewares/correlation-id.middleware"
import { httpLogger } from "@shared/middlewares/http-logger.middleware"
import { generalRateLimit } from "@shared/middlewares/rate-limit.middleware"
import { errorHandler } from "@shared/middlewares/error.middleware"
import authRouter from "@modules/auth/presentation/routes/v1/auth.route"
import organizationRouter from "@modules/organization/presentation/routes/v1/organization.route"
import invitationRouter from "@modules/organization/presentation/routes/v1/invitation.route"
import { logger } from "@shared/logging/logger"

const app = express()
const PORT = env.PORT

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
app.use(
  cors({
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
  })
)

// 5. Rate limiting
app.use(generalRateLimit)

// 6. Parse JSON body
app.use(express.json())

// 7. Passport
app.use(passport.initialize())

// 8. Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Bootstrapper API is running" })
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/organizations", organizationRouter)
app.use("/api/v1/invitations", invitationRouter)

// 9. Global error handler — ต้องลงทะเบียนเป็นตัวสุดท้ายเสมอ
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`)
})
