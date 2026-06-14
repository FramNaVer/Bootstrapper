import { UserRepository } from "../../domain/repositories/user.repository"
import { VerificationTokenRepository } from "../../domain/repositories/verification-token.repository"
import { EmailService } from "../ports/email.service"
import {
  generateRawToken,
  hashToken,
  getPasswordResetExpiry,
} from "../utils/token.util"
import { env } from "../../infrastructure/config/env"

// ขอรีเซ็ตรหัสผ่าน — ส่งลิงก์ reset ไปทางอีเมล
// ตอบ success เสมอ ไม่เปิดเผยว่า email มีในระบบไหม (กัน enumeration)
export class RequestPasswordResetUseCase {
  constructor(
    private userRepo: UserRepository,
    private tokenRepo: VerificationTokenRepository,
    private emailService: EmailService
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email)
    if (!user || !user.isActive) {
      return
    }

    await this.tokenRepo.invalidateAllForUser(user.id, "PASSWORD_RESET")

    const rawToken = generateRawToken()
    await this.tokenRepo.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      type: "PASSWORD_RESET",
      expiresAt: getPasswordResetExpiry(),
    })

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`
    await this.emailService.sendPasswordReset(user.email, resetUrl)
  }
}
