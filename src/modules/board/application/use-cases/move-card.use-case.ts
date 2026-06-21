import { CardRepository } from "../../domain/repositories/card.repository"
import { ListRepository } from "../../domain/repositories/list.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getCardInBoard } from "../utils/card-access.util"
import { getListInBoard } from "../utils/list-access.util"

// ย้ายการ์ด: ไป list ใหม่ และ/หรือ เปลี่ยนตำแหน่ง
//
// แนวคิด position: client เป็นคนคำนวณตำแหน่งใหม่ส่งมา (เช่น ลากวางระหว่างการ์ด
// pos 1000 กับ 2000 → ส่ง position = 1500) เพราะ client รู้ว่าเพื่อนบ้านคือใบไหน
// server แค่ "ยืนยันสิทธิ์ + บันทึก" ไม่ต้องคำนวณเอง → ง่ายและยืดหยุ่นที่สุด
export class MoveCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private listRepo: ListRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    actorId: string
    targetListId: string
    position: number
  }) {
    const { organizationId, boardId, cardId, actorId, targetListId, position } =
      params

    // 1) การ์ดต้องอยู่ใน board+org ที่เรียก
    const card = await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)
    // 2) list ปลายทางก็ต้องอยู่ใน board+org เดียวกัน (กันย้ายข้ามกระดาน/ข้าม tenant)
    await getListInBoard(this.listRepo, targetListId, boardId, organizationId)

    const fromListId = card.listId
    const moved = await this.cardRepo.move(cardId, {
      listId: targetListId,
      position,
    })

    // หมายเหตุ atomicity: การ move กับการเขียน log เป็นคนละ statement
    // ถ้า log พังหลัง move สำเร็จ → การ์ดย้ายแล้วแต่ไม่มีบันทึก (data ไม่ผิด แค่ฟีดขาด)
    // โปรเจคจริงจะห่อ 2 อย่างใน transaction เดียว หรือใช้ outbox pattern
    // ที่นี่แยกไว้เพื่อความอ่านง่าย — เป็นจุดที่อัปเกรดได้ภายหลัง
    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId,
      action: "CARD_MOVED",
      payload: { cardId, fromListId, toListId: targetListId },
    })

    return moved
  }
}
