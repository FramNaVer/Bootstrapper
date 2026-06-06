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

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private logoutUseCase: LogoutUseCase
  ) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { displayName, email, password } = req.body
      const user = await this.registerUseCase.execute({ displayName, email, password })
      res.status(201).json({
        success: true,
        message: "Account created successfully",
        data: { user },
      })
    } catch (error) {
      next(error) // ส่ง error ไปให้ errorHandler middleware จัดการ
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body
      const result = await this.loginUseCase.execute({ email, password })
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
      // req.user ถูก set โดย Passport หลัง OAuth callback สำเร็จ
      const result = req.user as { accessToken: string; refreshToken: string; user: unknown }
      res.status(200).json({
        success: true,
        message: "Google login successful",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  githubLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = req.user as { accessToken: string; refreshToken: string; user: unknown }
      res.status(200).json({
        success: true,
        message: "GitHub login successful",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body
      const result = await this.refreshTokenUseCase.execute(refreshToken)
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
      const { refreshToken } = req.body
      await this.logoutUseCase.execute(refreshToken)
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
