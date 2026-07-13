// =============================================================
// Auth Routes (v1)  — Composition Root
// =============================================================
// ไฟล์นี้ทำ 2 อย่าง:
//   1. Dependency Injection — สร้าง use cases และส่ง dependencies เข้าไป
//   2. ลงทะเบียน routes พร้อม middlewares
//
// Composition Root คือที่เดียวที่รู้จัก concrete classes (PrismaUserRepository ฯลฯ)
// Use cases ข้างใน depend on interfaces เท่านั้น → DIP ถูกต้อง
//
// ทำไมถึงอยู่ที่ routes/v1/?
// เมื่อเพิ่ม features ใหม่ที่ breaking change → สร้าง routes/v2/ ได้เลย
// โดยไม่กระทบ client ที่ใช้ v1 อยู่
// =============================================================

import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { PrismaUserRepository } from "../../../infrastructure/repositories/prisma-user.repository"
import { PrismaTokenRepository } from "../../../infrastructure/repositories/prisma-token.repository"
import { PrismaVerificationTokenRepository } from "../../../infrastructure/repositories/prisma-verification-token.repository"
import { NodemailerEmailService } from "../../../infrastructure/email/nodemailer-email.service"
import { RegisterUseCase } from "../../../application/use-cases/register.use-case"
import { LoginUseCase } from "../../../application/use-cases/login.use-case"
import { GoogleLoginUseCase } from "../../../application/use-cases/google-login.use-case"
import { GithubLoginUseCase } from "../../../application/use-cases/github-login.use-case"
import { RefreshTokenUseCase } from "../../../application/use-cases/refresh-token.use-case"
import { LogoutUseCase } from "../../../application/use-cases/logout.use-case"
import { SendVerificationEmailUseCase } from "../../../application/use-cases/send-verification-email.use-case"
import { VerifyEmailUseCase } from "../../../application/use-cases/verify-email.use-case"
import { ResendVerificationEmailUseCase } from "../../../application/use-cases/resend-verification-email.use-case"
import { RequestPasswordResetUseCase } from "../../../application/use-cases/request-password-reset.use-case"
import { ResetPasswordUseCase } from "../../../application/use-cases/reset-password.use-case"
import { GetMeUseCase } from "../../../application/use-cases/get-me.use-case"
import { AuthController } from "../../controllers/auth.controller"
import { authenticate } from "../../middlewares/authenticate.middleware"
import { setupPassport, setupGithubPassport } from "../../../infrastructure/config/passport.config"
import { validate } from "@shared/middlewares/validate.middleware"
import {
  authRateLimit,
  refreshRateLimit,
} from "@shared/middlewares/rate-limit.middleware"
import {
  loginSchema,
  registerSchema,
  emailSchema,
  verifyEmailSchema,
  resetPasswordSchema,
} from "../../validators/auth.validator"
import passport from "passport"

// --- Dependency Injection ---
// ลำดับการ inject: repository → use case → controller
const userRepo = new PrismaUserRepository(prisma)
const tokenRepo = new PrismaTokenRepository(prisma)
const verificationTokenRepo = new PrismaVerificationTokenRepository(prisma)
const emailService = new NodemailerEmailService()

const registerUseCase = new RegisterUseCase(userRepo)
const loginUseCase = new LoginUseCase(userRepo, tokenRepo)
const googleLoginUseCase = new GoogleLoginUseCase(userRepo, tokenRepo)
const githubLoginUseCase = new GithubLoginUseCase(userRepo, tokenRepo)
const refreshTokenUseCase = new RefreshTokenUseCase(tokenRepo)
const logoutUseCase = new LogoutUseCase(tokenRepo)
const getMeUseCase = new GetMeUseCase(userRepo)

const sendVerificationEmailUseCase = new SendVerificationEmailUseCase(
  verificationTokenRepo,
  emailService
)
const verifyEmailUseCase = new VerifyEmailUseCase(userRepo, verificationTokenRepo)
const resendVerificationEmailUseCase = new ResendVerificationEmailUseCase(
  userRepo,
  sendVerificationEmailUseCase
)
const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
  userRepo,
  verificationTokenRepo,
  emailService
)
const resetPasswordUseCase = new ResetPasswordUseCase(
  userRepo,
  verificationTokenRepo,
  tokenRepo
)

const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  refreshTokenUseCase,
  logoutUseCase,
  sendVerificationEmailUseCase,
  verifyEmailUseCase,
  resendVerificationEmailUseCase,
  requestPasswordResetUseCase,
  resetPasswordUseCase,
  getMeUseCase
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

// Current user (ต้อง login) — ใช้ rehydrate สถานะ login ฝั่ง frontend
router.get("/me", authenticate, authController.me)

// Token Management
// refresh ใช้ limiter แยก (หลวมกว่า login แต่เข้มกว่า general) — ดูเหตุผลใน rate-limit.middleware
// ไม่มี validate(body) แล้ว: token มาได้สองทาง (httpOnly cookie = ทางใหม่,
// body = client รุ่นเดิมช่วงเปลี่ยนผ่าน) — controller เป็นคนเช็คว่ามีอย่างน้อยหนึ่งทาง
router.post("/refresh", refreshRateLimit, authController.refreshToken)
router.post("/logout", authController.logout)

// Email Verification
// token เดาไม่ได้อยู่แล้ว (random 256-bit) แต่จำกัดไว้กันยิงรัวเปลือง DB query ฟรี
router.post(
  "/verify-email",
  authRateLimit,
  validate(verifyEmailSchema),
  authController.verifyEmail
)
router.post(
  "/resend-verification",
  authRateLimit,
  validate(emailSchema),
  authController.resendVerification
)

// Password Reset
router.post(
  "/forgot-password",
  authRateLimit,
  validate(emailSchema),
  authController.requestPasswordReset
)
router.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword
)

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
