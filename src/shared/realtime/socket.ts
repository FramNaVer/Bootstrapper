// =============================================================
// Real-time (Socket.io)
// =============================================================
// 1) "invalidate over the wire" — หลัง mutation สำเร็จ broadcast สัญญาณเบาๆ
//    ให้คนอื่นในห้องบอร์ด refetch ผ่าน TanStack Query (ไม่ส่ง data จริง)
// 2) presence — ใครกำลังดูบอร์ดเดียวกันบ้าง (avatar เด้งเข้า/ออกสด)
//
// ชื่อ/อีเมลของ presence ดึงจาก server (lookup จาก userId ใน JWT) → client ปลอมไม่ได้
// =============================================================

import { Server } from "socket.io"
import type { Server as HttpServer } from "http"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"
import { verifyAccessToken } from "@modules/auth/application/utils/jwt.util"
import { prisma } from "@shared/database/prisma.client"
import { PrismaUserRepository } from "@modules/auth/infrastructure/repositories/prisma-user.repository"
import { PrismaBoardRepository } from "@modules/board/infrastructure/repositories/prisma-board.repository"
import { PrismaMembershipRepository } from "@modules/organization/infrastructure/repositories/prisma-membership.repository"

let io: Server | null = null

const userRepo = new PrismaUserRepository(prisma)
const boardRepo = new PrismaBoardRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)

// ผู้ใช้เข้าห้องบอร์ดได้ก็ต่อเมื่อเป็นสมาชิก org ของบอร์ดนั้น (กัน join มั่ว)
async function canAccessBoard(userId: string, boardId: string): Promise<boolean> {
  const board = await boardRepo.findById(boardId)
  if (!board) return false
  const membership = await membershipRepo.findByUserAndOrg(
    userId,
    board.organizationId
  )
  return membership !== null
}

// คำนวณ "ใครกำลังดูบอร์ดนี้" แล้ว broadcast (dedupe ตาม userId — เปิดหลายแท็บ = 1 คน)
// excludeSocketId: ใช้ตอน disconnecting (socket ยังค้างในห้อง ต้องตัดตัวเองออก)
async function broadcastPresence(boardId: string, excludeSocketId?: string) {
  if (!io) return
  const sockets = await io.in(`board:${boardId}`).fetchSockets()
  const byUser = new Map<
    string,
    { userId: string; displayName: string | null; email: string }
  >()
  for (const s of sockets) {
    if (s.id === excludeSocketId) continue
    const d = s.data as {
      userId?: string
      displayName?: string | null
      email?: string
    }
    if (d.userId) {
      byUser.set(d.userId, {
        userId: d.userId,
        displayName: d.displayName ?? null,
        email: d.email ?? "",
      })
    }
  }
  io.to(`board:${boardId}`).emit("board:presence", Array.from(byUser.values()))
}

export function initSocket(httpServer: HttpServer): void {
  const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  })

  // auth ทุก connection + โหลดโปรไฟล์ไว้ใช้แสดง presence
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) return next(new Error("unauthorized"))
      const payload = verifyAccessToken(token)
      const user = await userRepo.findById(payload.userId)
      socket.data.userId = payload.userId
      socket.data.displayName = user?.displayName ?? null
      socket.data.email = user?.email ?? ""
      next()
    } catch {
      next(new Error("unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    // ห้องส่วนตัวของ user → ใช้ push แจ้งเตือนถึงตัวบุคคล (ทุกแท็บของเขา)
    socket.join(`user:${socket.data.userId}`)

    socket.on("join-board", async (boardId: unknown) => {
      if (typeof boardId !== "string") return
      if (await canAccessBoard(socket.data.userId, boardId)) {
        socket.join(`board:${boardId}`)
        await broadcastPresence(boardId)
      }
    })

    socket.on("leave-board", async (boardId: unknown) => {
      if (typeof boardId !== "string") return
      socket.leave(`board:${boardId}`)
      await broadcastPresence(boardId)
    })

    // ห้องแชทของ org — เข้าได้เมื่อเป็นสมาชิกเท่านั้น (กัน join มั่วเหมือน board)
    socket.on("join-org", async (orgId: unknown) => {
      if (typeof orgId !== "string") return
      const membership = await membershipRepo.findByUserAndOrg(
        socket.data.userId,
        orgId
      )
      if (membership) socket.join(`org:${orgId}`)
    })

    socket.on("leave-org", (orgId: unknown) => {
      if (typeof orgId !== "string") return
      socket.leave(`org:${orgId}`)
    })

    // ก่อนหลุด socket ยังอยู่ในห้อง → update presence โดยตัดตัวเองออก
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("board:")) {
          broadcastPresence(room.slice("board:".length), socket.id)
        }
      }
    })
  })

  logger.info("Socket.io initialized")
}

// เรียกหลัง mutation ของบอร์ดสำเร็จ → บอกทุกคนในห้องให้ refetch
export function emitBoardChange(boardId: string): void {
  io?.to(`board:${boardId}`).emit("board:change")
}

// push แจ้งเตือนถึง user คนหนึ่ง (ทุกแท็บที่เปิดอยู่) → กระดิ่งเด้งสด
export function emitNotification(userId: string): void {
  io?.to(`user:${userId}`).emit("notification:new")
}

// แชท: push "ตัวข้อความจริง" เข้าห้อง org (ไม่ใช่สัญญาณ refetch แบบ board:change)
// — client เอา message ไป append ต่อท้ายได้ทันที ไม่ต้องยิง API ซ้ำ
export function emitChatMessage(orgId: string, message: unknown): void {
  io?.to(`org:${orgId}`).emit("chat:new", message)
}
