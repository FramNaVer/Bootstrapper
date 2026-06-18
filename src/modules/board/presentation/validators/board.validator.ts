import { z } from "zod"

export const createBoardSchema = z.object({
  name: z
    .string()
    .min(2, "Board name must be at least 2 characters")
    .max(80, "Board name must not exceed 80 characters"),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
})

// update: ทุกฟิลด์ optional แต่ต้องส่งมาอย่างน้อย 1 ฟิลด์
export const updateBoardSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

export type CreateBoardInput = z.infer<typeof createBoardSchema>
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>
