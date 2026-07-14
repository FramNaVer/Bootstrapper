import { UserRepository } from "../../domain/repositories/user.repository"
import { TokenRepository } from "../../domain/repositories/token.repository"
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt.util"
import { UnauthorizedError } from "@shared/errors/app.error"
import { normalizeEmail } from "@shared/utils/email.util"

export class GoogleLoginUseCase {
  constructor(
    private userRepo: UserRepository,
    private tokenRepo: TokenRepository
  ) {}

  async execute(profile: {
    googleId: string
    email: string | null
    displayName: string
    emailVerified: boolean
    avatarUrl?: string
  }) {
    // Google ปกติส่ง email มาเสมอ แต่กันไว้: ถ้าไม่มี email link บัญชีไม่ได้
    if (!profile.email) {
      throw new UnauthorizedError("Google account must have an email address")
    }

    // กัน account takeover: เชื่อ email ก็ต่อเมื่อ Google ยืนยันว่า verified แล้วเท่านั้น
    // ถ้าไม่เช็คตรงนี้ ผู้โจมตีตั้ง email ปลอมให้ตรงกับเหยื่อ → ถูก link เข้าบัญชี local เดิมได้
    if (!profile.emailVerified) {
      throw new UnauthorizedError("Google email is not verified")
    }

    // normalize ก่อนใช้เสมอ — email ใน DB เป็น lowercase ถ้าไม่แปลง
    // อาจ "หาไม่เจอ" แล้วสร้างบัญชีที่สองซ้อนบัญชีเดิมของ user
    const email = normalizeEmail(profile.email)

    // หา user จาก email ก่อน
    let user = await this.userRepo.findByEmail(email)

    if (!user) {
      // ไม่มีในระบบ → สร้างใหม่พร้อม link Google provider
      user = await this.userRepo.create({
        email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified,
        provider: "GOOGLE",
        providerUserId: profile.googleId,
      })
    } else {
      if (!user.isActive) {
        throw new UnauthorizedError("Invalid credentials")
      }
      // มีแล้ว → เชื่อม Google เข้ากับ account เดิม (upsert)
      await this.userRepo.linkOAuthProvider(user.id, {
        provider: "GOOGLE",
        providerUserId: profile.googleId,
      })
      // Google ยืนยัน email นี้แล้ว (guard ด้านบน) = พิสูจน์ความเป็นเจ้าของแล้ว
      // → ปลดล็อกให้บัญชี local ที่ยังไม่ verify ด้วย ไม่งั้นจะเข้าได้แต่ทาง OAuth
      if (!user.isEmailVerified) {
        await this.userRepo.markEmailVerified(user.id)
      }
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)
    await this.tokenRepo.save(user.id, refreshToken, getRefreshTokenExpiry())

    return { accessToken, refreshToken, user }
  }
}
