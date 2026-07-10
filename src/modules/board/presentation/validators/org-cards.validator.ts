import { z } from "zod"

const MAX_RANGE_DAYS = 100

// ช่วงเวลาที่ปฏิทินขอ (เดือนที่แสดง + วันเกินขอบเดือนหัวท้าย ≈ 6 สัปดาห์)
// จำกัดความกว้างไว้กัน query ไร้ขอบเขต — client ปกติไม่มีทางขอเกินนี้
// ถ้าเกิน = bug หรือคนยิงตรง ให้ fail เสียงดังดีกว่า scan ตารางทั้งปี
export const listDueCardsQuerySchema = z
  .object({
    dueFrom: z.coerce.date(),
    dueTo: z.coerce.date(),
  })
  .refine((q) => q.dueFrom <= q.dueTo, {
    message: "dueFrom must be before dueTo",
    path: ["dueFrom"],
  })
  .refine(
    (q) =>
      q.dueTo.getTime() - q.dueFrom.getTime() <=
      MAX_RANGE_DAYS * 24 * 60 * 60 * 1000,
    {
      message: `Date range must not exceed ${MAX_RANGE_DAYS} days`,
      path: ["dueTo"],
    }
  )

export type ListDueCardsQuery = z.infer<typeof listDueCardsQuerySchema>
