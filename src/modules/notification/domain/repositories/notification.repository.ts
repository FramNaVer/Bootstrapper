import { NotificationEntity } from "../entities/notification.entity"

export interface NotificationRepository {
  create(data: {
    userId: string
    type: string
    payload?: unknown
  }): Promise<NotificationEntity>

  listByUser(userId: string, limit?: number): Promise<NotificationEntity[]>

  countUnread(userId: string): Promise<number>

  // mark อ่าน (ตรวจ userId กันอ่าน/แก้ของคนอื่น) — คืน true ถ้าเป็นของ user จริง
  markRead(id: string, userId: string): Promise<boolean>

  markAllRead(userId: string): Promise<void>
}
