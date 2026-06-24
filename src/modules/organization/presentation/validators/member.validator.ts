import { z } from "zod"

export const changeMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"], {
    message: "Role must be one of OWNER, ADMIN, MEMBER, VIEWER",
  }),
})

export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>
