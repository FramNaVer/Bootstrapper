// =============================================================
// Auth Controller
// =============================================================
// Controller รับ HTTP request → เรียก use case → ส่ง response
// ไม่มี business logic ที่นี่ — แค่แปลง HTTP ↔ use case
//
// Response format มาตรฐาน:
//   success: true  → { success: true,  message: "...", data: {...} }
//   success: false → จัดการโดย errorHandler middleware
// =============================================================

import { Request, Response, NextFunction } from "express"
import { RegisterUseCase } from "../../application/use-cases/register.use-case"
import { LoginUseCase } from "../../application/use-cases/login.use-case"
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.use-case"
import { LogoutUseCase } from "../../application/use-cases/logout.use-case"
import { SendVerificationEmailUseCase } from "../../application/use-cases/send-verification-email.use-case"
import { VerifyEmailUseCase } from "../../application/use-cases/verify-email.use-case"
import { ResendVerificationEmailUseCase } from "../../application/use-cases/resend-verification-email.use-case"
import { RequestPasswordResetUseCase } from "../../application/use-cases/request-password-reset.use-case"
import { ResetPasswordUseCase } from "../../application/use-cases/reset-password.use-case"
import { GetMeUseCase } from "../../application/use-cases/get-me.use-case"
import { logger } from "@shared/logging/logger"
import { env } from "@shared/config/env"
import { UnauthorizedError } from "@shared/errors/app.error"
import {
  REFRESH_COOKIE,
  setRefreshCookie,
  clearRefreshCookie,
} from "../utils/refresh-cookie.util"

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private logoutUseCase: LogoutUseCase,
    private sendVerificationEmailUseCase: SendVerificationEmailUseCase,
    private verifyEmailUseCase: VerifyEmailUseCase,
    private resendVerificationEmailUseCase: ResendVerificationEmailUseCase,
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private getMeUseCase: GetMeUseCase
  ) {}

  // GET /auth/me — ดึง user ปัจจุบัน (route ผ่าน authenticate middleware แล้ว)
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.getMeUseCase.execute(req.userId!)
      res.status(200).json({
        success: true,
        message: "Current user retrieved successfully",
        data: { user },
      })
    } catch (error) {
      next(error)
    }
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { displayName, email, password } = req.body
      const user = await this.registerUseCase.execute({ displayName, email, password })

      // ส่งอีเมลยืนยัน — ถ้าส่งไม่สำเร็จ ไม่ควรทำให้การสมัครล้มเหลว
      // (user สมัครสำเร็จแล้ว ค่อยกด resend ได้ทีหลัง)
      try {
        await this.sendVerificationEmailUseCase.execute(user.id, user.email)
      } catch (emailError) {
        logger.error({ err: emailError, userId: user.id }, "Failed to send verification email")
      }

      res.status(201).json({
        success: true,
        message: "Account created successfully. Please verify your email.",
        data: { user },
      })
    } catch (error) {
      next(error) // ส่ง error ไปให้ errorHandler middleware จัดการ
    }
  }

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body
      await this.verifyEmailUseCase.execute(token)
      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body
      await this.resendVerificationEmailUseCase.execute(email)
      // ตอบเหมือนกันเสมอ ไม่เปิดเผยว่า email มีในระบบไหม
      res.status(200).json({
        success: true,
        message: "If the email exists and is unverified, a verification link has been sent.",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body
      await this.requestPasswordResetUseCase.execute(email)
      // ตอบเหมือนกันเสมอ ไม่เปิดเผยว่า email มีในระบบไหม
      res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent.",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body
      await this.resetPasswordUseCase.execute(token, password)
      res.status(200).json({
        success: true,
        message: "Password has been reset successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body
      const result = await this.loginUseCase.execute({ email, password })
      // ทางใหม่: refresh token ลง httpOnly cookie (JS อ่านไม่ได้ → กัน XSS ขโมย)
      setRefreshCookie(res, result.refreshToken)
      // ช่วงเปลี่ยนผ่าน: body ยังมี refreshToken ให้ client รุ่นเดิมที่ deploy อยู่
      // (ตัดออกในขั้น contract หลัง frontend ใหม่นิ่งแล้ว)
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.redirectToFrontendWithTokens(req, res)
    } catch (error) {
      next(error)
    }
  }

  githubLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.redirectToFrontendWithTokens(req, res)
    } catch (error) {
      next(error)
    }
  }

  // หลัง OAuth สำเร็จ Passport ใส่ token ไว้ที่ req.user
  // SPA รับ JSON จาก redirect ตรงๆ ไม่ได้ → เรา redirect กลับ frontend
  //
  // ทางใหม่: refresh token ถูกฝากเป็น httpOnly cookie ตั้งแต่ redirect นี้เลย
  // (redirect response ก็ set cookie ได้) — client ใหม่แค่เรียก /refresh ต่อ
  // ช่วงเปลี่ยนผ่านยังแนบ token ใน hash fragment ให้ client รุ่นเดิมด้วย
  // (fragment ไม่ถูกส่งไป server จึงไม่โผล่ใน log — และจะตัดทิ้งในขั้น contract
  //  หลังจากนั้น URL callback จะสะอาด ไม่มี token ให้เห็นเลย)
  private redirectToFrontendWithTokens(req: Request, res: Response) {
    const { accessToken, refreshToken } = req.user as {
      accessToken: string
      refreshToken: string
    }
    setRefreshCookie(res, refreshToken)
    const params = new URLSearchParams({ accessToken, refreshToken })
    res.redirect(`${env.FRONTEND_URL}/auth/callback#${params.toString()}`)
  }

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ทางใหม่ (cookie) มาก่อน ทางเก่า (body — client รุ่นเดิม) เป็น fallback
      const refreshToken: string | undefined =
        req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken
      if (!refreshToken) {
        throw new UnauthorizedError("Refresh token is required")
      }
      const result = await this.refreshTokenUseCase.execute(refreshToken)
      // rotation: cookie ใบใหม่ทับใบเก่าในทุกครั้งที่ refresh สำเร็จ
      setRefreshCookie(res, result.refreshToken)
      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken: string | undefined =
        req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken
      // logout เป็น idempotent: มี token ก็ revoke, ไม่มีก็แค่เคลียร์ cookie
      // (ไม่ 401 — ผู้ใช้กด logout ซ้ำ/พก cookie หมดอายุ ก็ควรจบสวยเสมอ)
      if (refreshToken) {
        await this.logoutUseCase.execute(refreshToken)
      }
      clearRefreshCookie(res)
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
