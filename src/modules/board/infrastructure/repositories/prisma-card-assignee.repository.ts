import { PrismaClient } from "@generated/prisma"
import { CardAssigneeRepository } from "../../domain/repositories/card-assignee.repository"
import { CardAssigneeEntity } from "../../domain/entities/card-assignee.entity"

export class PrismaCardAssigneeRepository implements CardAssigneeRepository {
  constructor(private prisma: PrismaClient) {}

  async assign(cardId: string, membershipId: string): Promise<void> {
    await this.prisma.cardAssignee.create({ data: { cardId, membershipId } })
  }

  async unassign(cardId: string, membershipId: string): Promise<void> {
    await this.prisma.cardAssignee.delete({
      where: { cardId_membershipId: { cardId, membershipId } },
    })
  }

  async exists(cardId: string, membershipId: string): Promise<boolean> {
    const row = await this.prisma.cardAssignee.findUnique({
      where: { cardId_membershipId: { cardId, membershipId } },
    })
    return row !== null
  }

  async listByCard(cardId: string): Promise<CardAssigneeEntity[]> {
    const rows = await this.prisma.cardAssignee.findMany({
      where: { cardId },
      include: { membership: { include: { user: true } } },
      orderBy: { assignedAt: "asc" },
    })
    return rows.map((r) => ({
      cardId: r.cardId,
      membershipId: r.membershipId,
      userId: r.membership.userId,
      email: r.membership.user.email,
      displayName: r.membership.user.displayName,
      assignedAt: r.assignedAt,
    }))
  }
}
