import { PrismaClient } from "@generated/prisma"
import { CommentRepository } from "../../domain/repositories/comment.repository"
import { CommentEntity } from "../../domain/entities/comment.entity"

export class PrismaCommentRepository implements CommentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    cardId: string
    authorId: string
    body: string
  }): Promise<CommentEntity> {
    return this.prisma.comment.create({ data })
  }

  async findById(id: string): Promise<CommentEntity | null> {
    return this.prisma.comment.findFirst({ where: { id, deletedAt: null } })
  }

  async listByCard(cardId: string): Promise<CommentEntity[]> {
    return this.prisma.comment.findMany({
      where: { cardId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
