import { z } from "zod"

export const inviteMemberSchema = z.object({
  // trim+lowercase ให้ตรงกับ email ของ user ใน DB (เก็บ lowercase เสมอ) —
  // ไม่งั้นผู้เชิญพิมพ์ "Foo@x.com" แล้วเจ้าของบัญชี foo@x.com จะรับคำเชิญไม่ได้
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"], {
    message: "Role must be one of OWNER, ADMIN, MEMBER, VIEWER",
  }),
})

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>
