import { Request, Response, NextFunction } from "express"
import { emitChatMessage } from "@shared/realtime/socket"
import { SendMessageUseCase } from "../../application/use-cases/send-message.use-case"
import { ListMessagesUseCase } from "../../application/use-cases/list-messages.use-case"
import { ListMessagesQuery } from "../validators/message.validator"

export class MessageController {
  constructor(
    private sendMessageUseCase: SendMessageUseCase,
    private listMessagesUseCase: ListMessagesUseCase
  ) {}

  send = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await this.sendMessageUseCase.execute({
        organizationId: req.params.orgId as string,
        authorId: req.userId!,
        body: req.body.body,
      })

      // push "ตัวข้อความจริง" ให้ทุกคนในห้อง org (รวมแท็บอื่นของคนส่งเอง)
      // — ต่างจาก board:change ที่เป็นสัญญาณให้ refetch: แชทต้อง append ทันที
      // การ refetch ประวัติทั้งหน้าต่อทุกข้อความทั้งช้าและเปลือง
      emitChatMessage(message.organizationId, message)

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: { message },
      })
    } catch (error) {
      next(error)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // validateQuery เก็บ query ที่แปลงชนิดแล้วไว้ที่ res.locals (Express 5: req.query เขียนทับไม่ได้)
      const { cursor, limit } = res.locals.query as ListMessagesQuery
      const result = await this.listMessagesUseCase.execute({
        organizationId: req.params.orgId as string,
        limit,
        cursor,
      })
      res.status(200).json({
        success: true,
        message: "Messages retrieved successfully",
        data: result, // { messages, nextCursor }
      })
    } catch (error) {
      next(error)
    }
  }
}
