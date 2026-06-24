import nodemailer, { Transporter } from "nodemailer"
import { InvitationEmailService } from "../../application/ports/invitation-email.service"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"

// adapter ส่งอีเมลคำเชิญ — แนวเดียวกับ auth nodemailer service
// dev (ไม่มี SMTP_HOST) → log ลิงก์ออก console แทนการส่งจริง
export class NodemailerInvitationEmailService implements InvitationEmailService {
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

  async sendInvite(to: string, acceptUrl: string): Promise<void> {
    const text = `You've been invited to join an organization.\n\nAccept the invitation here:\n\n${acceptUrl}\n\nThis invitation expires in 7 days.`
    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "You're invited to join an organization",
      text,
    })
    if (this.isDevTransport) {
      logger.info({ to, text }, "[DEV] invitation email (not actually sent)")
    }
  }
}
