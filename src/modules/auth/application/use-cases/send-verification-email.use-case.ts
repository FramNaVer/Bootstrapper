import { VerificationTokenRepository } from "../../domain/repositories/verification-token.repository"
import { EmailService } from "../ports/email.service"
import {
  generateRawToken,
  hashToken,
  getEmailVerificationExpiry,
} from "../utils/token.util"
import { env } from "@shared/config/env"

// ออก email-verification token ใหม่ + ส่งอีเมล
// ใช้ตอน register และตอน resend
export class SendVerificationEmailUseCase {
  constructor(
    private tokenRepo: VerificationTokenRepository,
    private emailService: EmailService
  ) {}

  async execute(userId: string, email: string): Promise<void> {
    // ฆ่า token เก่าก่อน — ให้มี verification token ใช้ได้ทีละตัว
    await this.tokenRepo.invalidateAllForUser(userId, "EMAIL_VERIFICATION")

    const rawToken = generateRawToken()
    await this.tokenRepo.create({
      userId,
      tokenHash: hashToken(rawToken),
      type: "EMAIL_VERIFICATION",
      expiresAt: getEmailVerificationExpiry(),
    })

    // ลิงก์ชี้ไปหน้า frontend (SPA) ที่จะเรียก POST /verify-email ให้
    // ต้องเป็น FRONTEND_URL ไม่ใช่ APP_URL (ตัวหลังคือ backend — เปิดแล้วไม่มีหน้าอะไร)
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`
    await this.emailService.sendEmailVerification(email, verifyUrl)
  }
}
