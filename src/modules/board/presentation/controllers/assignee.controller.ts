import { Request, Response, NextFunction } from "express"
import { AssignMemberUseCase } from "../../application/use-cases/assign-member.use-case"
import { UnassignMemberUseCase } from "../../application/use-cases/unassign-member.use-case"
import { ListAssigneesUseCase } from "../../application/use-cases/list-assignees.use-case"

export class AssigneeController {
  constructor(
    private assignMemberUseCase: AssignMemberUseCase,
    private unassignMemberUseCase: UnassignMemberUseCase,
    private listAssigneesUseCase: ListAssigneesUseCase
  ) {}

  assign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.assignMemberUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        actorId: req.userId!,
        targetUserId: req.body.userId,
      })
      res.status(201).json({
        success: true,
        message: "Member assigned successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  unassign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.unassignMemberUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        targetUserId: req.params.userId as string,
      })
      res.status(200).json({
        success: true,
        message: "Member unassigned successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignees = await this.listAssigneesUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.params.cardId as string
      )
      res.status(200).json({
        success: true,
        message: "Assignees retrieved successfully",
        data: { assignees },
      })
    } catch (error) {
      next(error)
    }
  }
}
