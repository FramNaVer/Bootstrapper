import { z } from "zod"

export const assignMemberSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
})

export type AssignMemberInput = z.infer<typeof assignMemberSchema>
