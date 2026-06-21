import { Request, Response, NextFunction } from "express"
import { MembershipRole } from "@modules/organization/domain/entities/membership.entity"
import { AddCommentUseCase } from "../../application/use-cases/add-comment.use-case"
import { ListCommentsUseCase } from "../../application/use-cases/list-comments.use-case"
import { DeleteCommentUseCase } from "../../application/use-cases/delete-comment.use-case"

export class CommentController {
  constructor(
    private addCommentUseCase: AddCommentUseCase,
    private listCommentsUseCase: ListCommentsUseCase,
    private deleteCommentUseCase: DeleteCommentUseCase
  ) {}

  addComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await this.addCommentUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        authorId: req.userId!,
        body: req.body.body,
      })
      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: { comment },
      })
    } catch (error) {
      next(error)
    }
  }

  listComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comments = await this.listCommentsUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.params.cardId as string
      )
      res.status(200).json({
        success: true,
        message: "Comments retrieved successfully",
        data: { comments },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.deleteCommentUseCase.execute({
        organizationId: req.params.orgId as string,
        cardId: req.params.cardId as string,
        commentId: req.params.commentId as string,
        callerUserId: req.userId!,
        callerRole: req.membershipRole as MembershipRole,
      })
      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
