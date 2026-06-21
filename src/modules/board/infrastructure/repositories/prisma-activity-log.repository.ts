import { PrismaClient, Prisma } from "@generated/prisma"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import {
  ActionType,
  ActivityLogEntity,
} from "../../domain/entities/activity-log.entity"

export class PrismaActivityLogRepository implements ActivityLogRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    boardId: string
    actorId: string
    action: ActionType
    payload?: unknown
  }): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        organizationId: data.organizationId,
        boardId: data.boardId,
        actorId: data.actorId,
        action: data.action,
        payload: data.payload as Prisma.InputJsonValue,
      },
    })
  }

  async listByBoard(
    boardId: string,
    limit = 50
  ): Promise<ActivityLogEntity[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      boardId: r.boardId,
      actorId: r.actorId,
      action: r.action as ActionType,
      payload: r.payload,
      createdAt: r.createdAt,
    }))
  }
}
