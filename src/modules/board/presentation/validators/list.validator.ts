import { z } from "zod"

export const createListSchema = z.object({
  name: z
    .string()
    .min(1, "List name must not be empty")
    .max(60, "List name must not exceed 60 characters"),
})

export const updateListSchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    // position ใช้ตอนย้ายคอลัมน์ — เป็น float ได้ (เช่น 1500 แทรกระหว่าง 1000 กับ 2000)
    // .finite() จำเป็น: z.number() ยอมรับ Infinity (ดูเหตุผลใน card.validator)
    position: z
      .number()
      .finite("position must be a finite number")
      .positive("position must be positive")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

export type CreateListInput = z.infer<typeof createListSchema>
export type UpdateListInput = z.infer<typeof updateListSchema>
