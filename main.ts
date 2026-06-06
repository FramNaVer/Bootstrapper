// =============================================================
// Application Entry Point
// =============================================================
// ลำดับ middleware สำคัญมาก:
//   1. Security (helmet, cors)
//   2. Rate limiting
//   3. Body parsing
//   4. Passport
//   5. Routes
//   6. Error handler ← ต้องอยู่ท้ายสุดเสมอ
// =============================================================

import "dotenv/config"
import express, { Request, Response } from "express"
import helmet from "helmet"
import cors from "cors"
import passport from "passport"
import { generalRateLimit } from "./src/presentation/middlewares/rate-limit.middleware"
import { errorHandler } from "./src/presentation/middlewares/error.middleware"
import authRouter from "./src/presentation/routes/v1/auth.route"

const app = express()
const PORT = process.env.PORT || 3000

// ป้องกัน common web vulnerabilities (XSS, clickjacking, MIME sniffing ฯลฯ)
app.use(helmet())

// กำหนดว่า origin ไหนเรียก API นี้ได้บ้าง
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true, // อนุญาตให้ส่ง cookies/auth headers ข้าม origin
  })
)

// Rate limit ทั่วทั้ง API (100 req/15min ต่อ IP)
app.use(generalRateLimit)

// Parse JSON request body
app.use(express.json())

// Initialize Passport (ต้องอยู่หลัง express.json())
app.use(passport.initialize())

// Health check endpoint — ใช้ตรวจสอบว่า server ยังทำงานอยู่
app.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Bootstrapper API is running" })
})

// Auth routes ทั้งหมดอยู่ภายใต้ /api/v1/auth
app.use("/api/v1/auth", authRouter)

// Global error handler — รับ error จาก next(error) ทุกที่ในแอป
// ต้องลงทะเบียนเป็น middleware ตัวสุดท้ายเสมอ
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`)
})
