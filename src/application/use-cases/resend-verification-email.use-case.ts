import { UserRepository } from "../../domain/repositories/user.repository"
import { SendVerificationEmailUseCase } from "./send-verification-email.use-case"

// ส่งอีเมลยืนยันซ้ำ
// ตอบ success เสมอ ไม่เปิดเผยว่า email มีในระบบไหม (กัน enumeration)
// และส่งเฉพาะกรณี user ยัง active และยังไม่ verified
export class ResendVerificationEmailUseCase {
  constructor(
    private userRepo: UserRepository,
    private sendVerificationEmail: SendVerificationEmailUseCase
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email)
    if (user && user.isActive && !user.isEmailVerified) {
      await this.sendVerificationEmail.execute(user.id, user.email)
    }
  }
}
