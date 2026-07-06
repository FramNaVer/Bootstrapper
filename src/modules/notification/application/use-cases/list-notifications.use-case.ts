import { NotificationRepository } from "../../domain/repositories/notification.repository"

// รายการแจ้งเตือนของผู้ใช้ + จำนวนที่ยังไม่อ่าน (ไว้โชว์ badge)
export class ListNotificationsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepo.listByUser(userId),
      this.notificationRepo.countUnread(userId),
    ])
    return { notifications, unreadCount }
  }
}
