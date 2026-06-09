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

import "dotenv/config"
import express, { Request, Response } from "express"
import helmet from "helmet"
import cors from "cors"
import passport from "passport"
import { correlationId } from "./src/presentation/middlewares/correlation-id.middleware"
import { httpLogger } from "./src/presentation/middlewares/http-logger.middleware"
import { generalRateLimit } from "./src/presentation/middlewares/rate-limit.middleware"
import { errorHandler } from "./src/presentation/middlewares/error.middleware"
import authRouter from "./src/presentation/routes/v1/auth.route"
import { logger } from "./src/infrastructure/logging/logger"

const app = express()
const PORT = process.env.PORT || 3000

// 1. Correlation ID — ต้องมาก่อนทุก middleware เพื่อให้ log ทุกตัวมี ID
app.use(correlationId)

// 2. HTTP Logger — log ทุก request/response โดยอัตโนมัติ
app.use(httpLogger)

// 3. Security headers
app.use(helmet())

// 4. CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
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

// 9. Global error handler — ต้องลงทะเบียนเป็นตัวสุดท้ายเสมอ
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`)
})
