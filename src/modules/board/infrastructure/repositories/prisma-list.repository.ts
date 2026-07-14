import { PrismaClient } from "@generated/prisma"
import { ListRepository } from "../../domain/repositories/list.repository"
import { ListEntity } from "../../domain/entities/list.entity"

export class PrismaListRepository implements ListRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    boardId: string
    name: string
    position: number
  }): Promise<ListEntity> {
    return this.prisma.list.create({ data })
  }

  async findById(id: string): Promise<ListEntity | null> {
    return this.prisma.list.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async listByBoard(boardId: string): Promise<ListEntity[]> {
    return this.prisma.list.findMany({
      where: { boardId, deletedAt: null },
      // createdAt ตัดสินเมื่อ position เท่ากัน → ลำดับนิ่ง (สำคัญตอน rebalance)
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    })
  }

  async getMaxPosition(boardId: string): Promise<number | null> {
    const result = await this.prisma.list.aggregate({
      where: { boardId, deletedAt: null },
      _max: { position: true },
    })
    return result._max.position
  }

  async update(
    id: string,
    data: { name?: string; position?: number }
  ): Promise<ListEntity> {
    return this.prisma.list.update({ where: { id }, data })
  }

  async updatePositions(
    items: { id: string; position: number }[]
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.list.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    )
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.list.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
