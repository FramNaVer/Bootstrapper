import { z } from "zod"

export const createCardSchema = z.object({
  listId: z.string().uuid("listId must be a valid UUID"),
  title: z
    .string()
    .min(1, "Card title must not be empty")
    .max(200, "Card title must not exceed 200 characters"),
  description: z.string().max(5000).optional(),
})

export const updateCardSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    // ISO date string → แปลงเป็น Date, ส่ง null เพื่อล้างกำหนดส่ง
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

// ย้ายการ์ด: ต้องระบุ list ปลายทาง + ตำแหน่งใหม่ (client คำนวณมาแล้ว)
export const moveCardSchema = z.object({
  targetListId: z.string().uuid("targetListId must be a valid UUID"),
  position: z.number(),
})

export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type MoveCardInput = z.infer<typeof moveCardSchema>
