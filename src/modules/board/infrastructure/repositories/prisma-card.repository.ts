import { PrismaClient } from "@generated/prisma"
import { CardRepository } from "../../domain/repositories/card.repository"
import {
  CardEntity,
  CardWithRelations,
} from "../../domain/entities/card.entity"

export class PrismaCardRepository implements CardRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    boardId: string
    listId: string
    title: string
    description?: string | null
    position: number
  }): Promise<CardEntity> {
    return this.prisma.card.create({
      data: {
        organizationId: data.organizationId,
        boardId: data.boardId,
        listId: data.listId,
        title: data.title,
        description: data.description ?? null,
        position: data.position,
      },
    })
  }

  async findById(id: string): Promise<CardEntity | null> {
    return this.prisma.card.findFirst({ where: { id, deletedAt: null } })
  }

  async listByBoard(boardId: string): Promise<CardWithRelations[]> {
    const rows = await this.prisma.card.findMany({
      where: { boardId, deletedAt: null },
      orderBy: { position: "asc" },
      include: {
        labels: { include: { label: true } },
        assignees: { include: { membership: { include: { user: true } } } },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      boardId: r.boardId,
      listId: r.listId,
      title: r.title,
      description: r.description,
      position: r.position,
      dueDate: r.dueDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      labels: r.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
      assignees: r.assignees.map((a) => ({
        userId: a.membership.userId,
        displayName: a.membership.user.displayName,
        email: a.membership.user.email,
      })),
    }))
  }

  async getMaxPosition(listId: string): Promise<number | null> {
    const result = await this.prisma.card.aggregate({
      where: { listId, deletedAt: null },
      _max: { position: true },
    })
    return result._max.position
  }

  async update(
    id: string,
    data: { title?: string; description?: string | null; dueDate?: Date | null }
  ): Promise<CardEntity> {
    return this.prisma.card.update({ where: { id }, data })
  }

  async move(
    id: string,
    data: { listId: string; position: number }
  ): Promise<CardEntity> {
    return this.prisma.card.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.card.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
