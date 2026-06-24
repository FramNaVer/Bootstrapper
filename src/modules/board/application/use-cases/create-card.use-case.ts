import { CardRepository } from "../../domain/repositories/card.repository"
import { ListRepository } from "../../domain/repositories/list.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getListInBoard } from "../utils/list-access.util"

const POSITION_GAP = 1000

export class CreateCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private listRepo: ListRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    listId: string
    actorId: string
    title: string
    description?: string | null
  }) {
    const { organizationId, boardId, listId, actorId } = params

    // ยืนยันว่า list ปลายทางอยู่ใน board+org ที่เรียก (กัน IDOR)
    await getListInBoard(this.listRepo, listId, boardId, organizationId)

    // การ์ดใหม่ต่อท้าย list: position = ตัวมากสุดใน list นั้น + ช่องว่าง
    const maxPosition = await this.cardRepo.getMaxPosition(listId)
    const position = (maxPosition ?? 0) + POSITION_GAP

    const card = await this.cardRepo.create({
      organizationId,
      boardId,
      listId,
      title: params.title,
      description: params.description ?? null,
      position,
    })

    // บันทึกฟีด — ดูหมายเหตุเรื่อง atomicity ที่ move-card.use-case
    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId,
      action: "CARD_CREATED",
      payload: { cardId: card.id, title: card.title, listId },
    })

    return card
  }
}
