import { NotificationRepository } from "../../domain/repositories/notification.repository"

// อ่านทั้งหมด (ใช้ตอนเปิดกระดิ่ง → เคลียร์ badge)
export class MarkAllNotificationsReadUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string) {
    await this.notificationRepo.markAllRead(userId)
  }
}
