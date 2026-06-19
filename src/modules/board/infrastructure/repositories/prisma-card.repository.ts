import { PrismaClient } from "@generated/prisma"
import { CardRepository } from "../../domain/repositories/card.repository"
import { CardEntity } from "../../domain/entities/card.entity"

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

  async listByBoard(boardId: string): Promise<CardEntity[]> {
    return this.prisma.card.findMany({
      where: { boardId, deletedAt: null },
      orderBy: { position: "asc" },
    })
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
