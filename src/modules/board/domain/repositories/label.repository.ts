import { LabelEntity } from "../entities/label.entity"

export interface LabelRepository {
  create(data: {
    organizationId: string
    boardId: string
    name: string
    color: string
  }): Promise<LabelEntity>

  findById(id: string): Promise<LabelEntity | null>

  listByBoard(boardId: string): Promise<LabelEntity[]>

  // hard delete — label เป็น metadata, ลบจริง (CardLabel หลุดเองด้วย Cascade)
  delete(id: string): Promise<void>

  // --- ความสัมพันธ์ card ↔ label ---
  attachToCard(cardId: string, labelId: string): Promise<void>
  detachFromCard(cardId: string, labelId: string): Promise<void>
  isAttached(cardId: string, labelId: string): Promise<boolean>
  listByCard(cardId: string): Promise<LabelEntity[]>
}
