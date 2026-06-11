// =============================================================
// Prisma Singleton
// =============================================================
// สร้าง PrismaClient ครั้งเดียวตลอดชีวิต application
//
// ทำไมต้อง singleton?
// - ถ้าสร้าง new PrismaClient() หลายที่ → connection pool หลายตัว
// - แต่ละ pool กิน DB connections → เกิน limit ของ DB ได้
// - Neon serverless มี connection limit → ยิ่งต้องระวัง
//
// Pattern: สร้าง instance 1 ครั้ง แล้ว export → ทุกไฟล์ import ใช้ร่วมกัน
// Node.js module system cache ไฟล์ไว้ → require/import ซ้ำ = object เดิม
// =============================================================

import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../../generated/prisma"

// Pool คือ pg connection pool — PrismaPg adapter ต้องการสิ่งนี้
// ไม่ใช่ connection ซ้ำซ้อน แต่คือ driver ที่ Prisma ใช้เชื่อมต่อ DB
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
