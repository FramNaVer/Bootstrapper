// =============================================================
// Email Worker — ผู้บริโภคของ email queue
// =============================================================
// รันใน process เดียวกับ API ไปก่อน (โปรเจคยัง single instance)
// วันที่อยากแยก: ย้ายการเรียก initEmailWorker ไป entry point ใหม่ได้เลย
// เพราะ worker คุยกับโลกภายนอกผ่าน queue เท่านั้น ไม่แตะ express
//
// deps ที่ inject ต้องเป็นตัว "ส่งจริง" (Nodemailer) เท่านั้น —
// ถ้าเผลอ inject ตัว Queued เข้ามา งานจะวนกลับเข้าคิวเป็น loop ไม่รู้จบ
import { Worker } from "bullmq"
import { logger } from "@shared/logging/logger"
import { EmailService } from "@modules/auth/application/ports/email.service"
import { InvitationEmailService } from "@modules/organization/application/ports/invitation-email.service"
import { createBullConnection, isRedisEnabled } from "./redis.connection"
import { EMAIL_QUEUE_NAME, EmailJob } from "./email.queue"

export function initEmailWorker(deps: {
  emailService: EmailService
  invitationEmailService: InvitationEmailService
}): Worker<EmailJob> | null {
  if (!isRedisEnabled()) {
    logger.info("Email worker disabled (no REDIS_URL — emails send inline)")
    return null
  }

  const worker = new Worker<EmailJob>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      const { kind, to, url } = job.data
      switch (kind) {
        case "verification":
          return deps.emailService.sendEmailVerification(to, url)
        case "password-reset":
          return deps.emailService.sendPasswordReset(to, url)
        case "invitation":
          return deps.invitationEmailService.sendInvite(to, url)
        default: {
          // kind ใหม่ที่ลืมเขียน handler ต้องดังทันที ไม่ใช่เงียบหาย
          const never: never = kind
          throw new Error(`Unknown email job kind: ${String(never)}`)
        }
      }
    },
    { connection: createBullConnection(), concurrency: 5 }
  )

  worker.on("failed", (job, err) => {
    logger.error(
      { err, jobId: job?.id, kind: job?.data.kind, attempts: job?.attemptsMade },
      "Email job failed"
    )
  })

  logger.info("Email worker started")
  return worker
}
