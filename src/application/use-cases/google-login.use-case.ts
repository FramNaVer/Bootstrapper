import { UserRepository } from "../../domain/repositories/user.repository"
import { TokenRepository } from "../../domain/repositories/token.repository"
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt.util"
import { UnauthorizedError } from "../../domain/errors/app.error"

export class GoogleLoginUseCase {
  constructor(
    private userRepo: UserRepository,
    private tokenRepo: TokenRepository
  ) {}

  async execute(profile: {
    googleId: string
    email: string
    displayName: string
    emailVerified: boolean
    avatarUrl?: string
  }) {
    // กัน account takeover: เชื่อ email ก็ต่อเมื่อ Google ยืนยันว่า verified แล้วเท่านั้น
    // ถ้าไม่เช็คตรงนี้ ผู้โจมตีตั้ง email ปลอมให้ตรงกับเหยื่อ → ถูก link เข้าบัญชี local เดิมได้
    if (!profile.emailVerified) {
      throw new UnauthorizedError("Google email is not verified")
    }

    // หา user จาก email ก่อน
    let user = await this.userRepo.findByEmail(profile.email)

    if (!user) {
      // ไม่มีในระบบ → สร้างใหม่พร้อม link Google provider
      user = await this.userRepo.create({
        email: profile.email,
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
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)
    await this.tokenRepo.save(user.id, refreshToken, getRefreshTokenExpiry())

    return { accessToken, refreshToken, user }
  }
}
