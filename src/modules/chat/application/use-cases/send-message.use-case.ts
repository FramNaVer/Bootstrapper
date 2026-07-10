import { MessageRepository } from "../../domain/repositories/message.repository"

// ส่งข้อความเข้าห้องแชทของ org
// สิทธิ์ (ต้องเป็นสมาชิก org) ตรวจแล้วที่ route — ทุก role ส่งได้รวม VIEWER:
// แชทคือการสื่อสาร ไม่ใช่การแก้เนื้อหาบอร์ดที่ VIEWER ถูกห้าม
export class SendMessageUseCase {
  constructor(private messageRepo: MessageRepository) {}

  async execute(input: {
    organizationId: string
    authorId: string
    body: string
  }) {
    return this.messageRepo.create(input)
  }
}
