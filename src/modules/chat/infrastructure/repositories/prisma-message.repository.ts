import { PrismaClient, Prisma } from "@generated/prisma"
import { MessageRepository } from "../../domain/repositories/message.repository"
import { MessageWithAuthor } from "../../domain/entities/message.entity"

const messageInclude = {
  author: { select: { displayName: true, email: true } },
} satisfies Prisma.MessageInclude

type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>

function toMessageWithAuthor(row: MessageRow): MessageWithAuthor {
  return {
    id: row.id,
    organizationId: row.organizationId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt,
    authorName: row.author.displayName,
    authorEmail: row.author.email,
  }
}

export class PrismaMessageRepository implements MessageRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    authorId: string
    body: string
  }): Promise<MessageWithAuthor> {
    const row = await this.prisma.message.create({
      data,
      include: messageInclude,
    })
    return toMessageWithAuthor(row)
  }

  async listByOrg(
    organizationId: string,
    take: number,
    cursor?: string
  ): Promise<MessageWithAuthor[]> {
    const rows = await this.prisma.message.findMany({
      where: { organizationId },
      // id เป็นตัวตัดสินรอง: createdAt ซ้ำกันได้ (ส่งพร้อมกัน) — ถ้าลำดับ
      // ไม่ "ตายตัว" cursor จะข้าม/ซ้ำข้อความตรงรอยต่อหน้าได้
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      // skip: 1 = ไม่เอาแถวของ cursor เอง (มันคือแถวสุดท้ายของหน้าก่อน)
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: messageInclude,
    })
    return rows.map(toMessageWithAuthor)
  }
}
