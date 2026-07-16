import { Prisma, PrismaClient } from "@generated/prisma"
import { TransactionContext } from "@shared/database/unit-of-work"
import { prismaFrom } from "@shared/database/prisma-unit-of-work"
import {
  ClaimedOutboxEvent,
  OutboxEventInput,
  OutboxRepository,
} from "./outbox.repository"

// event หนึ่งลองได้กี่ครั้ง (claim หนึ่งรอบ = หนึ่ง attempt) — ครบแล้วหยุด
// แถวค้างอยู่ใน DB พร้อม lastError ให้สืบสวน ไม่หายเงียบ
const MAX_ATTEMPTS = 5
// claim ค้างนานเท่าไหร่ถือว่า worker ที่จองไปตายแล้ว → ปล่อยให้ตัวอื่นจองใหม่
// (visibility timeout สไตล์ SQS) — ต้องยาวกว่าเวลาทำงานจริงของ handler มากๆ
const CLAIM_TIMEOUT_SECONDS = 60

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private prisma: PrismaClient) {}

  async create(event: OutboxEventInput, ctx?: TransactionContext): Promise<void> {
    await prismaFrom(this.prisma, ctx).outboxEvent.create({
      data: {
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
      },
    })
  }

  // UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING
  // = จองแบบ atomic ใน statement เดียว: หลาย instance รันพร้อมกันได้
  // โดยไม่มีทางหยิบ event ซ้ำกัน (SKIP LOCKED ข้ามแถวที่คนอื่นกำลังจอง)
  async claimBatch(limit: number): Promise<ClaimedOutboxEvent[]> {
    return this.prisma.$queryRaw<ClaimedOutboxEvent[]>`
      UPDATE "OutboxEvent"
      SET "claimedAt" = now(), "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM "OutboxEvent"
        WHERE "processedAt" IS NULL
          AND "attempts" < ${MAX_ATTEMPTS}
          AND ("claimedAt" IS NULL
               OR "claimedAt" < now() - make_interval(secs => ${CLAIM_TIMEOUT_SECONDS}))
        ORDER BY "createdAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "type", "payload"
    `
  }

  async markProcessed(id: string, ctx?: TransactionContext): Promise<void> {
    await prismaFrom(this.prisma, ctx).outboxEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      // ตัด error ไม่ให้บวมเกินเหตุ — เก็บพอวินิจฉัย ไม่ใช่ stack ยาวเป็นหน้า
      data: { lastError: error.slice(0, 2000) },
    })
  }
}
