import { z } from "zod"

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"], {
    message: "Role must be one of OWNER, ADMIN, MEMBER, VIEWER",
  }),
})

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>
