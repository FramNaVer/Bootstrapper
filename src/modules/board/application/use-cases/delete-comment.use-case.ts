import { ForbiddenError, NotFoundError } from "@shared/errors/app.error"
import { MembershipRole } from "@modules/organization/domain/entities/membership.entity"
import { CommentRepository } from "../../domain/repositories/comment.repository"

// ลบความเห็น — กฎ: ลบได้เฉพาะ "เจ้าของความเห็น" หรือ OWNER/ADMIN ของ org
// (MEMBER ทั่วไปลบความเห็นคนอื่นไม่ได้ แม้จะแก้การ์ดได้)
export class DeleteCommentUseCase {
  constructor(private commentRepo: CommentRepository) {}

  async execute(params: {
    organizationId: string
    cardId: string
    commentId: string
    callerUserId: string
    callerRole: MembershipRole
  }) {
    const { organizationId, cardId, commentId, callerUserId, callerRole } =
      params

    const comment = await this.commentRepo.findById(commentId)
    if (
      !comment ||
      comment.cardId !== cardId ||
      comment.organizationId !== organizationId
    ) {
      throw new NotFoundError("Comment")
    }

    const isAuthor = comment.authorId === callerUserId
    const isAdmin = callerRole === "OWNER" || callerRole === "ADMIN"
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenError("You can only delete your own comments")
    }

    await this.commentRepo.softDelete(commentId)
  }
}
