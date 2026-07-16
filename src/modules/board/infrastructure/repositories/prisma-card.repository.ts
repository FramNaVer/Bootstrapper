import { PrismaClient } from "@generated/prisma"
import { TransactionContext } from "@shared/database/unit-of-work"
import { prismaFrom } from "@shared/database/prisma-unit-of-work"
import { CardRepository } from "../../domain/repositories/card.repository"
import {
  CardEntity,
  CardWithBoard,
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

  async listDueInRange(
    organizationId: string,
    from: Date,
    to: Date
  ): Promise<CardWithBoard[]> {
    const rows = await this.prisma.card.findMany({
      where: {
        organizationId,
        deletedAt: null,
        dueDate: { gte: from, lte: to },
        // ลบบอร์ด (soft) จะติดธงที่บอร์ดตัวเดียว การ์ดข้างในยัง deletedAt: null
        // → ต้องกรองผ่าน relation ไม่งั้นการ์ดจากบอร์ดที่ลบแล้วโผล่บนปฏิทิน
        // (ลบ "ลิสต์" ไม่ต้องกรอง เพราะ softDeleteByList ติดธงการ์ดให้อยู่แล้ว)
        board: { deletedAt: null },
      },
      orderBy: { dueDate: "asc" },
      include: { board: { select: { name: true } } },
    })
    return rows.map(({ board, ...card }) => ({
      ...card,
      boardName: board.name,
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
    data: { listId: string; position: number },
    ctx?: TransactionContext
  ): Promise<CardEntity> {
    return prismaFrom(this.prisma, ctx).card.update({ where: { id }, data })
  }

  async listByListOrdered(listId: string): Promise<CardEntity[]> {
    return this.prisma.card.findMany({
      where: { listId, deletedAt: null },
      // createdAt เป็นตัวตัดสินเมื่อ position เท่ากัน (เคส gap หมดพอดี)
      // → ลำดับนิ่งพอให้ rebalance ให้ผลเดิมทุกครั้ง
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    })
  }

  async updatePositions(
    items: { id: string; position: number }[]
  ): Promise<void> {
    // transaction เดียว: ครึ่งๆ กลางๆ (บางใบขยับ บางใบไม่) แย่กว่าไม่ขยับเลย
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.card.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    )
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.card.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async softDeleteByList(listId: string): Promise<void> {
    await this.prisma.card.updateMany({
      where: { listId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }
}
