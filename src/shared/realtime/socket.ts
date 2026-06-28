// =============================================================
// Real-time (Socket.io)
// =============================================================
// แพทเทิร์น "invalidate over the wire":
//   - client ยัง mutate ผ่าน REST เหมือนเดิม (auth/RBAC ครบ)
//   - หลัง mutation สำเร็จ controller เรียก emitBoardChange(boardId)
//   - server broadcast event เบาๆ (ไม่มี data) ไปห้อง board:<id>
//   - client คนอื่นในห้องรับ event แล้ว refetch ผ่าน TanStack Query เอง
//
// socket แค่ "ส่งสัญญาณ" ไม่ได้ส่งข้อมูลจริง → ไม่มีข้อมูล sensitive รั่ว
// =============================================================

import { Server } from "socket.io"
import type { Server as HttpServer } from "http"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"
import { verifyAccessToken } from "@modules/auth/application/utils/jwt.util"
import { prisma } from "@shared/database/prisma.client"
import { PrismaBoardRepository } from "@modules/board/infrastructure/repositories/prisma-board.repository"
import { PrismaMembershipRepository } from "@modules/organization/infrastructure/repositories/prisma-membership.repository"

let io: Server | null = null

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

export function initSocket(httpServer: HttpServer): void {
  const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  })

  // auth ทุก connection ด้วย access token (มาตรฐานเดียวกับ REST)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) return next(new Error("unauthorized"))
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error("unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    socket.on("join-board", async (boardId: unknown) => {
      if (typeof boardId !== "string") return
      if (await canAccessBoard(socket.data.userId, boardId)) {
        socket.join(`board:${boardId}`)
      }
    })

    socket.on("leave-board", (boardId: unknown) => {
      if (typeof boardId === "string") socket.leave(`board:${boardId}`)
    })
  })

  logger.info("Socket.io initialized")
}

// เรียกหลัง mutation ของบอร์ดสำเร็จ → บอกทุกคนในห้องให้ refetch
export function emitBoardChange(boardId: string): void {
  io?.to(`board:${boardId}`).emit("board:change")
}
