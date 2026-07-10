import { CardRepository } from "../../domain/repositories/card.repository"

// การ์ดที่มีกำหนดส่งในช่วงเวลา จาก "ทุกบอร์ด" ของ org — ใช้กับปฏิทินหน้า org
//
// ไม่ต้องเช็ค board access รายใบเหมือน use case อื่น: ขอบเขตคือทั้ง org
// และสิทธิ์ระดับ org ถูกตรวจแล้วที่ route (requireRole = ต้องเป็นสมาชิก)
export class ListDueCardsUseCase {
  constructor(private cardRepo: CardRepository) {}

  async execute(input: { organizationId: string; dueFrom: Date; dueTo: Date }) {
    return this.cardRepo.listDueInRange(
      input.organizationId,
      input.dueFrom,
      input.dueTo
    )
  }
}
