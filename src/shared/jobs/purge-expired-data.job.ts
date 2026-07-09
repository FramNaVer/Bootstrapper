// =============================================================
// Purge Job — แม่บ้านของ DB: กวาดข้อมูลที่ "ตายแล้ว" ทิ้งเป็นรอบๆ
// =============================================================
// ทำไมต้องมี?
// - RefreshToken: ทุก login/refresh สร้างแถวใหม่ (rotation) แถวหมดอายุไม่มีใครลบ
//   → เคยสะสม ~100 แถวในไม่กี่สัปดาห์จากผู้ใช้ไม่กี่คน
// - Soft delete (deletedAt) ตั้งใจเก็บไว้ให้ "กู้คืนได้" ชั่วคราว ไม่ใช่ตลอดกาล
//   → พ้นช่วง retention แล้วต้องลบจริง ไม่งั้น DB โตข้างเดียว
//
// หลักการเลือกว่าอะไรลบได้:
// - ลบเฉพาะข้อมูลที่ "ไม่มีทางถูกใช้อีก" โดยนิยาม (หมดอายุ/ใช้ไปแล้ว/พ้น retention)
//   → รันซ้ำกี่รอบ/รันพร้อมกันหลายตัวก็ปลอดภัย (idempotent)
// - ข้อยกเว้นสำคัญ: refresh token ที่ "ถูก revoke แต่ยังไม่หมดอายุ" ต้องเก็บไว้!
//   reuse detection ต้องหาเจอว่า token นี้เคยถูก revoke ถึงจะจับการขโมยได้
//   (ลบก่อนเวลา = สัญญาณโจรกลายเป็น 401 ธรรมดา) — เลยลบเมื่อหมดอายุเท่านั้น
// =============================================================

import cron from "node-cron"
import { prisma } from "@shared/database/prisma.client"
import { logger } from "@shared/logging/logger"

// เก็บ soft-deleted ไว้ 30 วันเผื่อกู้คืน (อนาคตทำ trash UI ได้ในกรอบนี้)
const SOFT_DELETE_RETENTION_DAYS = 30
// แจ้งเตือนที่อ่านแล้วเก็บ 90 วันพอ (ประวัติเก่าไม่มีใครย้อนดู)
const READ_NOTIFICATION_RETENTION_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

export async function purgeExpiredData(): Promise<void> {
  const now = new Date()
  const softDeleteCutoff = new Date(
    now.getTime() - SOFT_DELETE_RETENTION_DAYS * DAY_MS
  )
  const notificationCutoff = new Date(
    now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * DAY_MS
  )

  // --- Token ที่ตายแล้ว ---
  // refresh: หมดอายุ = JWT verify ปฏิเสธก่อนถึง DB อยู่แล้ว → แถวนี้ไร้ประโยชน์
  const refreshTokens = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now } },
  })
  // verification/reset: หมดอายุ หรือถูกใช้ไปแล้ว (single-use)
  const verificationTokens = await prisma.verificationToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }] },
  })

  // --- คำเชิญที่จบชีวิตแล้ว (เก็บไว้ 30 วันเป็นประวัติ แล้วค่อยกวาด) ---
  const invitations = await prisma.invitation.deleteMany({
    where: {
      OR: [
        { status: { not: "PENDING" }, createdAt: { lt: softDeleteCutoff } },
        { status: "PENDING", expiresAt: { lt: softDeleteCutoff } },
      ],
    },
  })

  // --- เนื้อหา soft-deleted ที่พ้น retention ---
  // ลำดับ "ลูกก่อนแม่" (comment → card → list → board) — ที่เหลือค้าง
  // FK onDelete: Cascade เก็บให้ตอนลบแม่อยู่แล้ว แต่ลบลูกก่อนทำให้ตัวเลข log ตรงจริง
  const comments = await prisma.comment.deleteMany({
    where: { deletedAt: { lt: softDeleteCutoff } },
  })
  const cards = await prisma.card.deleteMany({
    where: { deletedAt: { lt: softDeleteCutoff } },
  })
  const lists = await prisma.list.deleteMany({
    where: { deletedAt: { lt: softDeleteCutoff } },
  })
  const boards = await prisma.board.deleteMany({
    where: { deletedAt: { lt: softDeleteCutoff } },
  })

  // --- แจ้งเตือนเก่าที่อ่านแล้ว ---
  const notifications = await prisma.notification.deleteMany({
    where: { readAt: { not: null }, createdAt: { lt: notificationCutoff } },
  })

  logger.info(
    {
      refreshTokens: refreshTokens.count,
      verificationTokens: verificationTokens.count,
      invitations: invitations.count,
      comments: comments.count,
      cards: cards.count,
      lists: lists.count,
      boards: boards.count,
      notifications: notifications.count,
    },
    "Purge job completed"
  )
}

// เรียกครั้งเดียวตอน boot (จาก main.ts)
export function initPurgeJob(): void {
  // ตี 3 เวลาไทยทุกวัน — Railway รันเป็น UTC → 20:00 UTC = 03:00 ICT
  // (กับดักคลาสสิก: เขียน cron ตามเวลาท้องถิ่นแล้ว server อยู่ timezone อื่น)
  cron.schedule("0 20 * * *", () => {
    purgeExpiredData().catch((err) =>
      logger.error({ err }, "Purge job failed")
    )
  })

  // รันหนึ่งรอบหลัง boot ~30 วิ — กันเคส restart/deploy ข้ามเวลานัดพอดี
  // ปลอดภัยเพราะ job ลบเฉพาะของที่ตายโดยนิยาม รันกี่รอบผลเท่าเดิม (idempotent)
  setTimeout(() => {
    purgeExpiredData().catch((err) =>
      logger.error({ err }, "Purge job failed (boot run)")
    )
  }, 30_000)

  logger.info("Purge job scheduled (daily 20:00 UTC = 03:00 ICT + on boot)")
}
