import { Request, Response, NextFunction } from "express"
import { CreateBoardUseCase } from "../../application/use-cases/create-board.use-case"
import { ListBoardsUseCase } from "../../application/use-cases/list-boards.use-case"
import { GetBoardUseCase } from "../../application/use-cases/get-board.use-case"
import { UpdateBoardUseCase } from "../../application/use-cases/update-board.use-case"
import { DeleteBoardUseCase } from "../../application/use-cases/delete-board.use-case"

export class BoardController {
  constructor(
    private createBoardUseCase: CreateBoardUseCase,
    private listBoardsUseCase: ListBoardsUseCase,
    private getBoardUseCase: GetBoardUseCase,
    private updateBoardUseCase: UpdateBoardUseCase,
    private deleteBoardUseCase: DeleteBoardUseCase
  ) {}

  createBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await this.createBoardUseCase.execute(
        req.params.orgId as string,
        req.body
      )
      res.status(201).json({
        success: true,
        message: "Board created successfully",
        data: { board },
      })
    } catch (error) {
      next(error)
    }
  }

  listBoards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const boards = await this.listBoardsUseCase.execute(
        req.params.orgId as string
      )
      res.status(200).json({
        success: true,
        message: "Boards retrieved successfully",
        data: { boards },
      })
    } catch (error) {
      next(error)
    }
  }

  getBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await this.getBoardUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string
      )
      res.status(200).json({
        success: true,
        message: "Board retrieved successfully",
        data: { board },
      })
    } catch (error) {
      next(error)
    }
  }

  updateBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await this.updateBoardUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string,
        req.body
      )
      res.status(200).json({
        success: true,
        message: "Board updated successfully",
        data: { board },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.deleteBoardUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string
      )
      res.status(200).json({
        success: true,
        message: "Board deleted successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
