import { CardEntity, CardWithRelations } from "../entities/card.entity"

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

  // position มากสุดใน list หนึ่ง — ใช้คำนวณตำแหน่งการ์ดใหม่ (ต่อท้าย list)
  getMaxPosition(listId: string): Promise<number | null>

  update(
    id: string,
    data: { title?: string; description?: string | null; dueDate?: Date | null }
  ): Promise<CardEntity>

  // ย้ายการ์ด: เปลี่ยน list และ/หรือ ตำแหน่งในคราวเดียว
  move(id: string, data: { listId: string; position: number }): Promise<CardEntity>

  softDelete(id: string): Promise<void>
}
