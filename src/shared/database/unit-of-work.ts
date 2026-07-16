// =============================================================
// UnitOfWork — port สำหรับ "ทำหลายอย่างใน transaction เดียว"
// =============================================================
// ปัญหาที่แก้: use case ต้องเขียน 2 ตาราง (เช่น move card + outbox event)
// แบบ all-or-nothing แต่ application layer ห้ามรู้จัก Prisma โดยตรง
//
// TransactionContext เป็น opaque type (unknown) โดยเจตนา:
// use case แค่ "ถือแล้วส่งต่อ" ให้ repo — ไม่มีทางไปเรียกอะไรจากมันได้
// ฝั่ง infrastructure (repo) เป็นคนเดียวที่ downcast กลับเป็น Prisma tx client
export type TransactionContext = unknown

export interface UnitOfWork {
  run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>
}
