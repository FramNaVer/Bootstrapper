import { z } from "zod"

export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, "Label name must not be empty")
    .max(30, "Label name must not exceed 30 characters"),
  // hex color เช่น #61BD4F (3 หรือ 6 หลัก)
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code"),
})

// attach label เข้าการ์ด — ระบุ labelId ใน body
export const attachLabelSchema = z.object({
  labelId: z.string().uuid("labelId must be a valid UUID"),
})

export type CreateLabelInput = z.infer<typeof createLabelSchema>
export type AttachLabelInput = z.infer<typeof attachLabelSchema>
