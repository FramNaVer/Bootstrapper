import nodemailer, { Transporter } from "nodemailer"
import { EmailService } from "../../application/ports/email.service"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"

// Concrete implementation ของ EmailService ด้วย nodemailer
//
// ถ้าตั้งค่า SMTP_HOST → ส่งอีเมลจริงผ่าน SMTP
// ถ้าไม่ตั้ง (dev) → ใช้ jsonTransport (ไม่ส่งจริง) แล้ว log เนื้อหา + ลิงก์ออก console
//   เพื่อให้ก๊อปลิงก์ verify/reset ไปทดสอบได้โดยไม่ต้องตั้ง SMTP
export class NodemailerEmailService implements EmailService {
  private transporter: Transporter
  private readonly isDevTransport: boolean

  constructor() {
    if (env.SMTP_HOST) {
      this.isDevTransport = false
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      })
    } else {
      this.isDevTransport = true
      this.transporter = nodemailer.createTransport({ jsonTransport: true })
    }
  }

  async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    await this.send(
      to,
      "Verify your email",
      `Welcome! Please verify your email by visiting:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`
    )
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(
      to,
      "Reset your password",
      `You requested a password reset. Visit the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`
    )
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    await this.transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text })
    if (this.isDevTransport) {
      // dev: ไม่ได้ส่งจริง — log ออกมาเพื่อเอาลิงก์ไปทดสอบ
      logger.info({ to, subject, text }, "[DEV] email (not actually sent)")
    }
  }
}
