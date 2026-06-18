import { BoardEntity } from "../entities/board.entity"

export interface BoardRepository {
  create(data: {
    organizationId: string
    name: string
    description?: string | null
  }): Promise<BoardEntity>

  // หา board ตาม id — ต้องไม่ใช่ที่ถูก soft delete แล้ว (deletedAt = null)
  findById(id: string): Promise<BoardEntity | null>

  // board ทั้งหมดของ org (เฉพาะที่ยังไม่ถูกลบ)
  listByOrg(organizationId: string): Promise<BoardEntity[]>

  update(
    id: string,
    data: { name?: string; description?: string | null }
  ): Promise<BoardEntity>

  // soft delete — เซ็ต deletedAt แทนการลบจริง (กู้คืนได้)
  softDelete(id: string): Promise<void>
}
