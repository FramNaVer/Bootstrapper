// =============================================================
// Application Entry Point
// =============================================================
// ประกอบ app อยู่ใน src/app.ts (แยกไว้เพื่อให้ test import ได้)
// ไฟล์นี้ทำหน้าที่เดียว: เปิด server ฟัง request จริง
// =============================================================

import { createServer } from "http"
import { app } from "./src/app"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"
import { prisma } from "@shared/database/prisma.client"
import { PrismaUnitOfWork } from "@shared/database/prisma-unit-of-work"
import { initSocket } from "@shared/realtime/socket"
import { initPurgeJob } from "@shared/jobs/purge-expired-data.job"
import { initEmailWorker } from "@shared/queue/email.worker"
import { OutboxProcessor } from "@shared/outbox/outbox.processor"
import { PrismaOutboxRepository } from "@shared/outbox/prisma-outbox.repository"
import { initOutboxWorker } from "@shared/outbox/outbox.worker"
import { NodemailerEmailService } from "@modules/auth/infrastructure/email/nodemailer-email.service"
import { NodemailerInvitationEmailService } from "@modules/organization/infrastructure/email/nodemailer-invitation-email.service"
import { PrismaActivityLogRepository } from "@modules/board/infrastructure/repositories/prisma-activity-log.repository"
import {
  CARD_MOVED_EVENT,
  makeCardMovedHandler,
} from "@modules/board/application/outbox-handlers/card-moved.handler"
import {
  CARD_CREATED_EVENT,
  makeCardCreateHandler,
} from "@modules/board/application/outbox-handlers/card-created.handler"

const PORT = env.PORT

// ห่อ Express ด้วย http server เพื่อแชร์ port เดียวกับ Socket.io
const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`)
  // งานแม่บ้าน DB (ล้าง token หมดอายุ/soft-delete พ้น retention) — ดูรายละเอียดในไฟล์ job
  initPurgeJob()

  // --- Background workers (รันใน process เดียวกับ API ไปก่อน) ---
  // วันที่โหลดเยอะจนอยากแยก: ย้ายบล็อกนี้ไป entry point ใหม่ได้เลย
  // เพราะ worker คุยกับระบบผ่าน queue/DB เท่านั้น ไม่แตะ express

  // email worker: ⚠️ ต้อง inject ตัวส่งจริง (Nodemailer) เท่านั้น —
  // ตัว Queued จะโยนงานกลับเข้าคิวเป็น loop
  initEmailWorker({
    emailService: new NodemailerEmailService(),
    invitationEmailService: new NodemailerInvitationEmailService(),
  })

  // outbox worker: ทะเบียน handler ทั้งหมดอยู่ตรงนี้ — เพิ่ม event ใหม่
  // ต้องมาลงทะเบียนที่นี่ ไม่งั้น processor จะ markFailed ว่าไม่รู้จัก type
  const activityRepo = new PrismaActivityLogRepository(prisma)
  const outboxProcessor = new OutboxProcessor(
    new PrismaOutboxRepository(prisma),
    new PrismaUnitOfWork(prisma),
    {
      [CARD_MOVED_EVENT]: makeCardMovedHandler(activityRepo),
      [CARD_CREATED_EVENT]: makeCardCreateHandler(activityRepo),
    }
  )
  initOutboxWorker(outboxProcessor)
})
