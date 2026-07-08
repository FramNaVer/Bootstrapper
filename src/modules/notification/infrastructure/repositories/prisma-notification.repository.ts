import { PrismaClient, Prisma } from "@generated/prisma"
import { NotificationRepository } from "../../domain/repositories/notification.repository"
import { NotificationEntity } from "../../domain/entities/notification.entity"

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId: string
    type: string
    payload?: unknown
  }): Promise<NotificationEntity> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        payload: data.payload as Prisma.InputJsonValue,
      },
    })
  }

  async listByUser(userId: string, limit = 30): Promise<NotificationEntity[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    })
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    // updateMany + เงื่อนไข userId → กันอ่านของคนอื่น (คืนจำนวนแถวที่โดน)
    // ไม่ใส่ readAt:null → อ่านซ้ำได้ idempotent (count>0 = เป็นของ user จริง)
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    })
    return result.count > 0
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  }
}
