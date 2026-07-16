// =============================================================
// QueuedEmailService — decorator: เข้าคิวก่อน ส่งตรงเมื่อไม่มีคิว
// =============================================================
// implements EmailService ตัวเดียวกับ Nodemailer → use case ไม่รู้ความต่างเลย
// (สลับที่ composition root ที่เดียว — นี่คือประโยชน์ของ port/adapter)
//
// ลำดับความพยายาม: enqueue (ได้ retry ฟรีจาก BullMQ) → ถ้าคิวใช้ไม่ได้
// (ไม่มี REDIS_URL / Redis ล่ม) → ส่ง inline ผ่านตัวจริงเหมือนพฤติกรรมเดิม
import { EmailService } from "../../application/ports/email.service"
import { enqueueEmail } from "@shared/queue/email.queue"

export class QueuedEmailService implements EmailService {
  constructor(private inline: EmailService) {}

  async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    const queued = await enqueueEmail({ kind: "verification", to, url: verifyUrl })
    if (!queued) await this.inline.sendEmailVerification(to, verifyUrl)
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const queued = await enqueueEmail({ kind: "password-reset", to, url: resetUrl })
    if (!queued) await this.inline.sendPasswordReset(to, resetUrl)
  }
}
