import { describe, it, expect } from "vitest"
import { moveCardSchema } from "../card.validator"

// position ต้องเป็น finite + positive — z.number() เฉยๆ ยอมรับ Infinity
// (JSON.parse("1e999") → Infinity) ซึ่งทำให้ ordering ของ list พังถาวร
describe("moveCardSchema position", () => {
    const base = { targetListId: "123e4567-e89b-12d3-a456-426614174000" }

    it("rejects Infinity (JSON.parse('1e999'))", () => {
        const result = moveCardSchema.safeParse({
            ...base,
            position: JSON.parse("1e999"), // = Infinity — เข้ามาทาง JSON body ได้จริง
        })
        expect(result.success).toBe(false)
    })

    it("rejects negative and zero positions", () => {
        expect(moveCardSchema.safeParse({ ...base, position: -1 }).success).toBe(false)
        expect(moveCardSchema.safeParse({ ...base, position: 0 }).success).toBe(false)
    })

    it("accepts a normal midpoint position", () => {
        const result = moveCardSchema.safeParse({ ...base, position: 1500.5 })
        expect(result.success).toBe(true)
    })
})
