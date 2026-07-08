import { UserRepository } from "../../domain/repositories/user.repository"
import { TokenRepository } from "../../domain/repositories/token.repository"
import { UnauthorizedError } from "@shared/errors/app.error"
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt.util"

export class GithubLoginUseCase {
  constructor(
    private userRepository: UserRepository,
    private tokenRepo: TokenRepository
  ) {}

  async execute(profile: {
    githubId: string
    email: string | null
    emailVerified: boolean
    displayName: string
    avatarUrl?: string
  }) {
    // GitHub account บางบัญชีไม่ได้ set public email → ใช้ login ไม่ได้
    if (!profile.email) {
      throw new UnauthorizedError(
        "GitHub account must have a public email address"
      )
    }

    // กัน account takeover เหมือนฝั่ง Google: เชื่อ email ต่อเมื่อ GitHub
    // ยืนยันแล้วเท่านั้น ป้องกันผู้โจมตีตั้ง email ปลอมให้ตรงกับเหยื่อ
    // แล้วถูก link เข้าบัญชี local เดิม
    if (!profile.emailVerified) {
      throw new UnauthorizedError("GitHub email is not verified")
    }

    let user = await this.userRepository.findByEmail(profile.email)

    if (!user) {
      user = await this.userRepository.create({
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified,
        provider: "GITHUB",
        providerUserId: profile.githubId,
      })
    } else {
      if(!user.isActive){
        throw new UnauthorizedError("Invalid credentials")
      }
      await this.userRepository.linkOAuthProvider(user.id, {
        provider: "GITHUB",
        providerUserId: profile.githubId,
      })
      // GitHub ยืนยัน email นี้แล้ว (guard ด้านบน) = พิสูจน์ความเป็นเจ้าของแล้ว
      // → ปลดล็อกให้บัญชี local ที่ยังไม่ verify ด้วย ไม่งั้นจะเข้าได้แต่ทาง OAuth
      if (!user.isEmailVerified) {
        await this.userRepository.markEmailVerified(user.id)
      }
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)
    await this.tokenRepo.save(user.id, refreshToken, getRefreshTokenExpiry())

    return { accessToken, refreshToken, user }
  }
}
