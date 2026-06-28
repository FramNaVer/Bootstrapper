import { NotificationRepository } from "../../domain/repositories/notification.repository"
import { NotFoundError } from "@shared/errors/app.error"

// อ่าน notification 1 รายการ (markRead ตรวจ userId แล้ว — ของคนอื่นจะคืน false)
export class MarkNotificationReadUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string, id: string) {
    const ok = await this.notificationRepo.markRead(id, userId)
    if (!ok) throw new NotFoundError("Notification")
  }
}
