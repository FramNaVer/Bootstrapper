import { MessageWithAuthor } from "../entities/message.entity"

export interface MessageRepository {
  create(data: {
    organizationId: string
    authorId: string
    body: string
  }): Promise<MessageWithAuthor>

  // ประวัติแชทของ org เรียงใหม่→เก่า ทีละหน้า
  // cursor = id ของข้อความสุดท้ายจากหน้าก่อน (ไม่ส่ง = เริ่มจากล่าสุด)
  listByOrg(
    organizationId: string,
    take: number,
    cursor?: string
  ): Promise<MessageWithAuthor[]>
}
