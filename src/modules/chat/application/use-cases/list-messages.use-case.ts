import { MessageRepository } from "../../domain/repositories/message.repository"

// ประวัติแชทแบบ cursor pagination (ใหม่→เก่า)
//
// เคล็ด "ขอเกิน 1": ดึง limit+1 แถว —
//   ได้ครบ limit+1 = ยังมีหน้าถัดไปแน่นอน → ตัดตัวเกินทิ้ง, nextCursor = id ตัวสุดท้ายที่ส่ง
//   ได้น้อยกว่า = หมดแล้ว → nextCursor = null
// ถ้าใช้ "ได้ครบ limit = มีต่อ" เฉยๆ จะโกหกตอนข้อมูลพอดีหน้า (ผู้ใช้กดโหลดต่อแล้วได้หน้าว่าง)
export class ListMessagesUseCase {
  constructor(private messageRepo: MessageRepository) {}

  async execute(input: {
    organizationId: string
    limit: number
    cursor?: string
  }) {
    const rows = await this.messageRepo.listByOrg(
      input.organizationId,
      input.limit + 1,
      input.cursor
    )

    const hasMore = rows.length > input.limit
    const messages = hasMore ? rows.slice(0, input.limit) : rows
    return {
      messages,
      nextCursor: hasMore ? messages[messages.length - 1].id : null,
    }
  }
}
