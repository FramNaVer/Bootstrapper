import { Request, Response, NextFunction } from "express"
import { ListDueCardsUseCase } from "../../application/use-cases/list-due-cards.use-case"
import { ListDueCardsQuery } from "../validators/org-cards.validator"

// การ์ดระดับ org (ข้ามบอร์ด) — ตอนนี้มีแค่ปฏิทินกำหนดส่ง
export class OrgCardsController {
  constructor(private listDueCardsUseCase: ListDueCardsUseCase) {}

  listDueCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // validateQuery เก็บ query ที่แปลงชนิดแล้วไว้ที่ res.locals (ดูคอมเมนต์ใน middleware)
      const { dueFrom, dueTo } = res.locals.query as ListDueCardsQuery
      const cards = await this.listDueCardsUseCase.execute({
        organizationId: req.params.orgId as string,
        dueFrom,
        dueTo,
      })
      res.status(200).json({
        success: true,
        message: "Due cards retrieved successfully",
        data: { cards },
      })
    } catch (error) {
      next(error)
    }
  }
}
