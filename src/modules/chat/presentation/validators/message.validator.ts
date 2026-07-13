import { z } from "zod"

export const sendMessageSchema = z.object({
  // trim ก่อนเช็ค: ข้อความช่องว่างล้วน = ข้อความว่าง
  body: z
    .string()
    .trim()
    .min(1, "Message must not be empty")
    .max(2000, "Message must not exceed 2000 characters"),
})

// query string ทุกตัวเป็น string → limit ต้อง coerce เป็นตัวเลขเอง
export const listMessagesQuerySchema = z.object({
  cursor: z.string().uuid("cursor must be a valid message id").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
