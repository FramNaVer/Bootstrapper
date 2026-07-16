// Prisma implementation ของ UnitOfWork + ตัวช่วยฝั่ง repo
import { Prisma, PrismaClient } from "@generated/prisma"
import { TransactionContext, UnitOfWork } from "./unit-of-work"

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private prisma: PrismaClient) {}

  run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx))
  }
}

// ตัวช่วยของ repo: มี ctx = ใช้ tx client (อยู่ใน transaction), ไม่มี = client ปกติ
// อยู่ที่เดียวเพื่อให้การ downcast opaque type เกิดจุดเดียว ไม่กระจายทุก repo
export function prismaFrom(
  fallback: PrismaClient,
  ctx?: TransactionContext
): PrismaClient | Prisma.TransactionClient {
  return ctx ? (ctx as Prisma.TransactionClient) : fallback
}
