import { PrismaClient } from "@generated/prisma"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { LabelEntity } from "../../domain/entities/label.entity"

export class PrismaLabelRepository implements LabelRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    boardId: string
    name: string
    color: string
  }): Promise<LabelEntity> {
    return this.prisma.label.create({ data })
  }

  async findById(id: string): Promise<LabelEntity | null> {
    return this.prisma.label.findUnique({ where: { id } })
  }

  async listByBoard(boardId: string): Promise<LabelEntity[]> {
    return this.prisma.label.findMany({
      where: { boardId },
      orderBy: { name: "asc" },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.label.delete({ where: { id } })
  }

  async attachToCard(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.create({ data: { cardId, labelId } })
  }

  async detachFromCard(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.delete({
      where: { cardId_labelId: { cardId, labelId } },
    })
  }

  async isAttached(cardId: string, labelId: string): Promise<boolean> {
    const row = await this.prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    })
    return row !== null
  }

  async listByCard(cardId: string): Promise<LabelEntity[]> {
    const rows = await this.prisma.cardLabel.findMany({
      where: { cardId },
      include: { label: true },
    })
    return rows.map((r) => r.label)
  }
}
