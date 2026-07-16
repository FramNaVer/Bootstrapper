import { UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "@shared/outbox/outbox.repository"
import { CardRepository } from "../../domain/repositories/card.repository"
import { ListRepository } from "../../domain/repositories/list.repository"
import { getCardInBoard } from "../utils/card-access.util"
import { getListInBoard } from "../utils/list-access.util"
import { needsRebalance, rebalancedPositions } from "../utils/position.util"
import {
  CARD_MOVED_EVENT,
  CardMovedPayload,
} from "../outbox-handlers/card-moved.handler"

// ย้ายการ์ด: ไป list ใหม่ และ/หรือ เปลี่ยนตำแหน่ง
//
// แนวคิด position: client เป็นคนคำนวณตำแหน่งใหม่ส่งมา (เช่น ลากวางระหว่างการ์ด
// pos 1000 กับ 2000 → ส่ง position = 1500) เพราะ client รู้ว่าเพื่อนบ้านคือใบไหน
// server แค่ "ยืนยันสิทธิ์ + บันทึก" ไม่ต้องคำนวณเอง → ง่ายและยืดหยุ่นที่สุด
//
// Transactional outbox (แก้ปัญหา atomicity ที่เคยจดไว้ตรงนี้):
// การ move กับ "เหตุการณ์ CARD_MOVED" ถูกเขียนใน transaction เดียว —
// สำเร็จด้วยกันหรือหายด้วยกัน จากนั้น outbox worker ค่อยแปลง event
// เป็น activity log (พร้อม retry) → ไม่มีทางเกิด "การ์ดย้ายแล้วแต่ฟีดไม่รู้"
export class MoveCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private listRepo: ListRepository,
    private uow: UnitOfWork,
    private outboxRepo: OutboxRepository
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
    const payload: CardMovedPayload = {
      organizationId,
      boardId,
      actorId,
      cardId,
      fromListId,
      toListId: targetListId,
    }

    const moved = await this.uow.run(async (tx) => {
      const result = await this.cardRepo.move(
        cardId,
        { listId: targetListId, position },
        tx
      )
      await this.outboxRepo.create(
        { type: CARD_MOVED_EVENT, payload },
        tx
      )
      return result
    })

    // float มีความละเอียดจำกัด: ลากแทรกจุดเดิมซ้ำๆ ช่องว่างถูกหารครึ่งจนหมด
    // → position ชนกัน ลำดับเด้งไปมา — หลังย้ายเช็ค list ปลายทาง ถ้า gap
    // แคบกว่าขั้นต่ำให้จัดระยะใหม่เป็นช่วงห่างมาตรฐานทั้ง list
    // (อยู่นอก transaction โดยเจตนา: เป็นงานซ่อมบำรุง ไม่ใช่เงื่อนไขของการย้าย)
    const cardsInList = await this.cardRepo.listByListOrdered(targetListId)
    if (needsRebalance(cardsInList.map((c) => c.position))) {
      await this.cardRepo.updatePositions(rebalancedPositions(cardsInList))
    }

    return moved
  }
}
