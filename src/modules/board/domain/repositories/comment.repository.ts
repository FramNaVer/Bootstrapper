import { CommentEntity, CommentWithAuthor } from "../entities/comment.entity"
import { TransactionContext } from "@shared/database/unit-of-work"


export interface CommentRepository {
  create(data: {
    organizationId: string
    cardId: string
    authorId: string
    body: string
  }, ctx?: TransactionContext): Promise<CommentEntity>

  findById(id: string): Promise<CommentEntity | null>

  // ความเห็นของการ์ด เรียงเก่า→ใหม่ (เฉพาะที่ยังไม่ถูกลบ) พร้อมชื่อคนเขียน
  listByCard(cardId: string): Promise<CommentWithAuthor[]>

  softDelete(id: string): Promise<void>
}
