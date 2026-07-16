import { describe, it, expect } from "vitest"
import { registerSchema, loginSchema, emailSchema } from "../auth.validator"
import { inviteMemberSchema } from "@modules/organization/presentation/validators/invitation.validator"

// ===================================================================
// Email normalization ที่ชั้น validator
// ===================================================================
// กฎ: email ต้องถูก trim + lowercase ก่อนเข้า use case เสมอ
// (DB เก็บ lowercase — ดูเหตุผลใน @shared/utils/email.util.ts)
// ถ้าเทสต์กลุ่มนี้พัง = บัค "สมัคร Foo@x.com แล้ว login foo@x.com ไม่ผ่าน /
// OAuth สร้างบัญชีซ้ำ / รับคำเชิญไม่ได้" จะกลับมา
describe("email normalization in validators", () => {
    it.each([
        ["registerSchema", () => registerSchema.parse({ email: "  Somchai@GMail.com ", password: "password123" }).email],
        ["loginSchema", () => loginSchema.parse({ email: "  Somchai@GMail.com ", password: "x" }).email],
        ["emailSchema", () => emailSchema.parse({ email: "  Somchai@GMail.com " }).email],
        ["inviteMemberSchema", () => inviteMemberSchema.parse({ email: "  Somchai@GMail.com ", role: "MEMBER" }).email],
    ])("%s lowercases and trims email", (_name, parse) => {
        expect(parse()).toBe("somchai@gmail.com")
    })

    it("still rejects invalid email after normalization", () => {
        expect(() => loginSchema.parse({ email: "not-an-email", password: "x" })).toThrow()
    })

    it("keeps already-normalized email unchanged", () => {
        expect(emailSchema.parse({ email: "a@b.com" }).email).toBe("a@b.com")
    })
})
