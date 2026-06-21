import { Request, Response, NextFunction } from "express"
import { CreateListUseCase } from "../../application/use-cases/create-list.use-case"
import { ListListsUseCase } from "../../application/use-cases/list-lists.use-case"
import { UpdateListUseCase } from "../../application/use-cases/update-list.use-case"
import { DeleteListUseCase } from "../../application/use-cases/delete-list.use-case"

export class ListController {
  constructor(
    private createListUseCase: CreateListUseCase,
    private listListsUseCase: ListListsUseCase,
    private updateListUseCase: UpdateListUseCase,
    private deleteListUseCase: DeleteListUseCase
  ) {}

  createList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await this.createListUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.body
      )
      res.status(201).json({
        success: true,
        message: "List created successfully",
        data: { list },
      })
    } catch (error) {
      next(error)
    }
  }

  listLists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lists = await this.listListsUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string
      )
      res.status(200).json({
        success: true,
        message: "Lists retrieved successfully",
        data: { lists },
      })
    } catch (error) {
      next(error)
    }
  }

  updateList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await this.updateListUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.params.listId as string,
        req.body
      )
      res.status(200).json({
        success: true,
        message: "List updated successfully",
        data: { list },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.deleteListUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.params.listId as string
      )
      res.status(200).json({
        success: true,
        message: "List deleted successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
