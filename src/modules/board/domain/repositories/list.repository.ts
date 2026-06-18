import { ListEntity } from "../entities/list.entity"

export interface ListRepository {
  create(data: {
    organizationId: string
    boardId: string
    name: string
    position: number
  }): Promise<ListEntity>

  findById(id: string): Promise<ListEntity | null>

  // list ทั้งหมดของ board เรียงตาม position (เฉพาะที่ยังไม่ถูกลบ)
  listByBoard(boardId: string): Promise<ListEntity[]>

  // position มากสุดใน board ปัจจุบัน — ใช้คำนวณตำแหน่งของ list ใหม่ (ต่อท้าย)
  // คืน null ถ้ายังไม่มี list เลย
  getMaxPosition(boardId: string): Promise<number | null>

  update(
    id: string,
    data: { name?: string; position?: number }
  ): Promise<ListEntity>

  softDelete(id: string): Promise<void>
}
