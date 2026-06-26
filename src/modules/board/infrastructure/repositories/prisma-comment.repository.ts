import { PrismaClient } from "@generated/prisma"
import { CommentRepository } from "../../domain/repositories/comment.repository"
import {
  CommentEntity,
  CommentWithAuthor,
} from "../../domain/entities/comment.entity"

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

  async listByCard(cardId: string): Promise<CommentWithAuthor[]> {
    const rows = await this.prisma.comment.findMany({
      where: { cardId, deletedAt: null },
      include: { author: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    })
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      cardId: r.cardId,
      authorId: r.authorId,
      body: r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorName: r.author.displayName,
      authorEmail: r.author.email,
    }))
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
