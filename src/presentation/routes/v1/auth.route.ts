// =============================================================
// Auth Routes (v1)
// =============================================================
// ไฟล์นี้ทำ 3 อย่าง:
//   1. ตั้งค่า Database connection
//   2. Dependency Injection — สร้าง use cases และส่ง dependencies เข้าไป
//   3. ลงทะเบียน routes พร้อม middlewares
//
// ทำไมถึงอยู่ที่ routes/v1/?
// เมื่อเพิ่ม features ใหม่ที่ breaking change → สร้าง routes/v2/ ได้เลย
// โดยไม่กระทบ client ที่ใช้ v1 อยู่
// =============================================================

import { Router } from "express"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../../../generated/prisma"
import { PrismaUserRepository } from "../../../infrastructure/repositories/prisma-user.repository"
import { PrismaTokenRepository } from "../../../infrastructure/repositories/prisma-token.repository"
import { RegisterUseCase } from "../../../application/use-cases/register.use-case"
import { LoginUseCase } from "../../../application/use-cases/login.use-case"
import { GoogleLoginUseCase } from "../../../application/use-cases/google-login.use-case"
import { GithubLoginUseCase } from "../../../application/use-cases/github-login.use-case"
import { RefreshTokenUseCase } from "../../../application/use-cases/refresh-token.use-case"
import { LogoutUseCase } from "../../../application/use-cases/logout.use-case"
import { AuthController } from "../../controllers/auth.controller"
import { setupPassport, setupGithubPassport } from "../../../infrastructure/config/passport.config"
import { validate } from "../../middlewares/validate.middleware"
import { authRateLimit } from "../../middlewares/rate-limit.middleware"
import { loginSchema, registerSchema, refreshTokenSchema } from "../../validators/auth.validator"
import passport from "passport"

// --- Database Setup ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// --- Dependency Injection ---
// ลำดับการ inject: repository → use case → controller
const userRepo = new PrismaUserRepository(prisma)
const tokenRepo = new PrismaTokenRepository(prisma)

const registerUseCase = new RegisterUseCase(userRepo)
const loginUseCase = new LoginUseCase(userRepo, tokenRepo)
const googleLoginUseCase = new GoogleLoginUseCase(userRepo, tokenRepo)
const githubLoginUseCase = new GithubLoginUseCase(userRepo, tokenRepo)
const refreshTokenUseCase = new RefreshTokenUseCase(tokenRepo)
const logoutUseCase = new LogoutUseCase(tokenRepo)

const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  refreshTokenUseCase,
  logoutUseCase
)

// ลงทะเบียน OAuth strategies กับ Passport
setupPassport(googleLoginUseCase)
setupGithubPassport(githubLoginUseCase)

// --- Routes ---
const router = Router()

// Local Auth
// validate(schema) → ตรวจ request body ก่อนถึง controller
// authRateLimit    → จำกัด 10 requests/15 min ต่อ IP
router.post("/register", authRateLimit, validate(registerSchema), authController.register)
router.post("/login", authRateLimit, validate(loginSchema), authController.login)

// Token Management
router.post("/refresh", validate(refreshTokenSchema), authController.refreshToken)
router.post("/logout", validate(refreshTokenSchema), authController.logout)

// Google OAuth — ไม่มี validate เพราะ request body ว่างเปล่า (Passport จัดการเอง)
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  authController.googleLogin
)

// GitHub OAuth
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }))
router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/login" }),
  authController.githubLogin
)

export default router
