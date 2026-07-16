import { TransactionContext } from "@shared/database/unit-of-work"
import {
  CardEntity,
  CardWithBoard,
  CardWithRelations,
} from "../entities/card.entity"

export interface CardRepository {
  create(data: {
    organizationId: string
    boardId: string
    listId: string
    title: string
    description?: string | null
    position: number
  }): Promise<CardEntity>

  findById(id: string): Promise<CardEntity | null>

  // การ์ดทั้งหมดของ board พร้อม label/assignee (สำหรับ board view — client จัดกลุ่มตาม listId เอง)
  listByBoard(boardId: string): Promise<CardWithRelations[]>

  // การ์ดที่มีกำหนดส่งในช่วง [from, to] จากทุกบอร์ดของ org (สำหรับปฏิทินรวม)
  listDueInRange(
    organizationId: string,
    from: Date,
    to: Date
  ): Promise<CardWithBoard[]>

  // position มากสุดใน list หนึ่ง — ใช้คำนวณตำแหน่งการ์ดใหม่ (ต่อท้าย list)
  getMaxPosition(listId: string): Promise<number | null>

  update(
    id: string,
    data: { title?: string; description?: string | null; dueDate?: Date | null }
  ): Promise<CardEntity>

  // ย้ายการ์ด: เปลี่ยน list และ/หรือ ตำแหน่งในคราวเดียว
  // ctx: ใช้ร่วม transaction กับ outbox event (mutation กับ event เกิด/ตายด้วยกัน)
  move(
    id: string,
    data: { listId: string; position: number },
    ctx?: TransactionContext
  ): Promise<CardEntity>

  // การ์ดใน list เดียว เรียงตาม position — ใช้เช็ค gap หลัง move (rebalance)
  listByListOrdered(listId: string): Promise<CardEntity[]>

  // เขียน position ใหม่หลายใบใน transaction เดียว (rebalance ทั้ง list)
  updatePositions(items: { id: string; position: number }[]): Promise<void>

  softDelete(id: string): Promise<void>

  // ลบการ์ดทั้งหมดใน list หนึ่ง (ใช้ตอนลบคอลัมน์ → การ์ดไม่ลอยค้าง)
  softDeleteByList(listId: string): Promise<void>
}
