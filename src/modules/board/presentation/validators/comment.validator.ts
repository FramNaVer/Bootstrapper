import { z } from "zod"

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment must not be empty")
    .max(2000, "Comment must not exceed 2000 characters"),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
