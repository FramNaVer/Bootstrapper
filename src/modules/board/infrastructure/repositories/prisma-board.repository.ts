import { PrismaClient } from "@generated/prisma"
import { BoardRepository } from "../../domain/repositories/board.repository"
import { BoardEntity } from "../../domain/entities/board.entity"

export class PrismaBoardRepository implements BoardRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    name: string
    description?: string | null
  }): Promise<BoardEntity> {
    return this.prisma.board.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description ?? null,
      },
    })
  }

  async findById(id: string): Promise<BoardEntity | null> {
    // deletedAt: null → board ที่ถูก soft delete จะถือว่า "หาไม่เจอ"
    return this.prisma.board.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async listByOrg(organizationId: string): Promise<BoardEntity[]> {
    return this.prisma.board.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    })
  }

  async update(
    id: string,
    data: { name?: string; description?: string | null }
  ): Promise<BoardEntity> {
    return this.prisma.board.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.board.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
