import { Request, Response, NextFunction } from "express"
import { CreateLabelUseCase } from "../../application/use-cases/create-label.use-case"
import { ListLabelsUseCase } from "../../application/use-cases/list-labels.use-case"
import { DeleteLabelUseCase } from "../../application/use-cases/delete-label.use-case"
import { AttachLabelUseCase } from "../../application/use-cases/attach-label.use-case"
import { DetachLabelUseCase } from "../../application/use-cases/detach-label.use-case"

export class LabelController {
  constructor(
    private createLabelUseCase: CreateLabelUseCase,
    private listLabelsUseCase: ListLabelsUseCase,
    private deleteLabelUseCase: DeleteLabelUseCase,
    private attachLabelUseCase: AttachLabelUseCase,
    private detachLabelUseCase: DetachLabelUseCase
  ) {}

  createLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const label = await this.createLabelUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.body
      )
      res.status(201).json({
        success: true,
        message: "Label created successfully",
        data: { label },
      })
    } catch (error) {
      next(error)
    }
  }

  listLabels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labels = await this.listLabelsUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string
      )
      res.status(200).json({
        success: true,
        message: "Labels retrieved successfully",
        data: { labels },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.deleteLabelUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.params.labelId as string
      )
      res.status(200).json({
        success: true,
        message: "Label deleted successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  attachLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.attachLabelUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        labelId: req.body.labelId,
      })
      res.status(201).json({
        success: true,
        message: "Label attached successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  detachLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.detachLabelUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        labelId: req.params.labelId as string,
      })
      res.status(200).json({
        success: true,
        message: "Label detached successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
