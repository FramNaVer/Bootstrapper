import { Request, Response, NextFunction } from "express"
import { CreateCardUseCase } from "../../application/use-cases/create-card.use-case"
import { ListCardsUseCase } from "../../application/use-cases/list-cards.use-case"
import { GetCardUseCase } from "../../application/use-cases/get-card.use-case"
import { UpdateCardUseCase } from "../../application/use-cases/update-card.use-case"
import { MoveCardUseCase } from "../../application/use-cases/move-card.use-case"
import { DeleteCardUseCase } from "../../application/use-cases/delete-card.use-case"

export class CardController {
  constructor(
    private createCardUseCase: CreateCardUseCase,
    private listCardsUseCase: ListCardsUseCase,
    private getCardUseCase: GetCardUseCase,
    private updateCardUseCase: UpdateCardUseCase,
    private moveCardUseCase: MoveCardUseCase,
    private deleteCardUseCase: DeleteCardUseCase
  ) {}

  createCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.createCardUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        listId: req.body.listId,
        actorId: req.userId!,
        title: req.body.title,
        description: req.body.description,
      })
      res.status(201).json({
        success: true,
        message: "Card created successfully",
        data: { card },
      })
    } catch (error) {
      next(error)
    }
  }

  listCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cards = await this.listCardsUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string
      )
      res.status(200).json({
        success: true,
        message: "Cards retrieved successfully",
        data: { cards },
      })
    } catch (error) {
      next(error)
    }
  }

  getCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.getCardUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.params.cardId as string
      )
      res.status(200).json({
        success: true,
        message: "Card retrieved successfully",
        data: { card },
      })
    } catch (error) {
      next(error)
    }
  }

  updateCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.updateCardUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        actorId: req.userId!,
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
      })
      res.status(200).json({
        success: true,
        message: "Card updated successfully",
        data: { card },
      })
    } catch (error) {
      next(error)
    }
  }

  moveCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.moveCardUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        actorId: req.userId!,
        targetListId: req.body.targetListId,
        position: req.body.position,
      })
      res.status(200).json({
        success: true,
        message: "Card moved successfully",
        data: { card },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.deleteCardUseCase.execute({
        organizationId: req.params.orgId as string,
        boardId: req.params.boardId as string,
        cardId: req.params.cardId as string,
        actorId: req.userId!,
      })
      res.status(200).json({
        success: true,
        message: "Card deleted successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
