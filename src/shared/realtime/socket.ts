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
import { createAdapter } from "@socket.io/redis-adapter"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"
import {
  createRedisConnection,
  isRedisEnabled,
} from "@shared/queue/redis.connection"
import { verifyAccessToken } from "@modules/auth/application/utils/jwt.util"
import { prisma } from "@shared/database/prisma.client"
import { PrismaUserRepository } from "@modules/auth/infrastructure/repositories/prisma-user.repository"
import { PrismaBoardRepository } from "@modules/board/infrastructure/repositories/prisma-board.repository"
import { PrismaMembershipRepository } from "@modules/organization/infrastructure/repositories/prisma-membership.repository"

let io: Server | null = null

const userRepo = new PrismaUserRepository(prisma)
const boardRepo = new PrismaBoardRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)

// --- presence: อัปเดต "เห็นล่าสุดเมื่อ" ของ user ---
// client ยิง heartbeat ทุก ~60s ขณะเปิดแอป → เก็บเวลา active ล่าสุดลง DB
// throttle ในหน่วยความจำ: เขียนซ้ำไม่ถี่กว่านี้ (กัน DB write ทุก event ต่อ user)
// (เป็น process-local — หลาย instance ต่างเก็บ map ของตัวเอง ก็แค่เขียน DB
//  บ่อยขึ้นเป็นจำนวนเท่าของ instance ซึ่งยังห่างจนไม่กระทบ)
const LAST_SEEN_THROTTLE_MS = 45_000
const lastSeenWrites = new Map<string, number>()

function touchLastSeen(userId: string): void {
  const now = Date.now()
  const prev = lastSeenWrites.get(userId) ?? 0
  if (now - prev < LAST_SEEN_THROTTLE_MS) return
  lastSeenWrites.set(userId, now)
  userRepo
    .updateLastSeen(userId, new Date(now))
    .catch((err) => logger.error({ err, userId }, "updateLastSeen failed"))
}

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

  // Redis adapter — ปลดข้อจำกัด single instance ของ realtime:
  // ห้อง/broadcast/fetchSockets ทำงานข้ามทุก instance ผ่าน Redis pub/sub
  // (ไม่มี Redis = adapter ในหน่วยความจำแบบเดิม ใช้ได้กับ instance เดียว)
  // adapter ต้องใช้ pub/sub แยกคู่ — connection ที่ subscribe แล้วใช้คำสั่งอื่นไม่ได้
  if (isRedisEnabled()) {
    const pubClient = createRedisConnection()
    const subClient = pubClient.duplicate()
    io.adapter(createAdapter(pubClient, subClient))
    logger.info("Socket.io Redis adapter enabled")
  }

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
    // (join/leave คืน Promise เมื่อ adapter เป็น async เช่น Redis — ใน sync
    //  context ใช้ void ทิ้งอย่างตั้งใจ, ใน async handler ให้ await จริง)
    void socket.join(`user:${socket.data.userId}`)

    // เชื่อมต่อสำเร็จ = active ทันที + heartbeat ต่อเนื่องระหว่างเปิดแอป
    touchLastSeen(socket.data.userId)
    socket.on("heartbeat", () => touchLastSeen(socket.data.userId))

    socket.on("join-board", async (boardId: unknown) => {
      if (typeof boardId !== "string") return
      if (await canAccessBoard(socket.data.userId, boardId)) {
        await socket.join(`board:${boardId}`)
        await broadcastPresence(boardId)
      }
    })

    socket.on("leave-board", async (boardId: unknown) => {
      if (typeof boardId !== "string") return
      await socket.leave(`board:${boardId}`)
      await broadcastPresence(boardId)
    })

    // ห้องแชทของ org — เข้าได้เมื่อเป็นสมาชิกเท่านั้น (กัน join มั่วเหมือน board)
    socket.on("join-org", async (orgId: unknown) => {
      if (typeof orgId !== "string") return
      const membership = await membershipRepo.findByUserAndOrg(
        socket.data.userId,
        orgId
      )
      if (membership) await socket.join(`org:${orgId}`)
    })

    socket.on("leave-org", (orgId: unknown) => {
      if (typeof orgId !== "string") return
      void socket.leave(`org:${orgId}`)
    })

    // ก่อนหลุด socket ยังอยู่ในห้อง → update presence โดยตัดตัวเองออก
    // fire-and-forget โดยเจตนา (คนกำลังหลุด ไม่มีใครรอผล) แต่ต้อง catch
    // ไม่งั้น reject จาก fetchSockets กลายเป็น unhandled rejection ฆ่า process ได้
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("board:")) {
          broadcastPresence(room.slice("board:".length), socket.id).catch(
            (err) => logger.error({ err }, "Presence broadcast failed")
          )
        }
      }
    })
  })

  logger.info("Socket.io initialized")
}

// เตะ socket ทุกตัวของ user ออกจากห้องของ org — เรียกหลัง "ลบสมาชิก" สำเร็จ
//
// ทำไมต้องมี: REST ถูกตัดสิทธิ์ทันทีที่ membership หาย (RBAC เช็คทุก request)
// แต่ห้อง socket เช็คสิทธิ์แค่ "ตอน join" — ถ้าไม่เตะ คนที่เพิ่งถูกลบจะยังรับ
// ข้อความแชท/presence/สัญญาณบอร์ดของ org นี้สดๆ ต่อไปจนกว่าจะปิดแท็บเอง
//
// best-effort โดยเจตนา: การลบสมาชิก commit ไปแล้ว ความล้มเหลวตรงนี้
// ห้ามทำให้ request ลบล้มตาม — ผู้เรียกควร catch + log เอง
export async function kickUserFromOrgRooms(
  userId: string,
  orgId: string
): Promise<void> {
  if (!io) return
  // ห้อง user:{id} มีทุก socket ของคนนั้น (ทุกแท็บ) — ใช้เป็นสารบัญหาตัว
  const sockets = await io.in(`user:${userId}`).fetchSockets()
  if (sockets.length === 0) return

  // รวมห้องบอร์ดที่เขาเปิดอยู่ แล้วกรองเฉพาะบอร์ดของ org ที่ถูกเตะ
  // (อาจเปิดบอร์ดของ org อื่นค้างไว้ด้วย — ห้ามไปยุ่งห้องพวกนั้น)
  const openBoardIds = new Set<string>()
  for (const s of sockets) {
    for (const room of s.rooms) {
      if (room.startsWith("board:")) openBoardIds.add(room.slice("board:".length))
    }
  }
  const kickedBoardIds: string[] = []
  for (const boardId of openBoardIds) {
    const board = await boardRepo.findById(boardId)
    if (board && board.organizationId === orgId) kickedBoardIds.push(boardId)
  }

  for (const s of sockets) {
    s.leave(`org:${orgId}`)
    for (const boardId of kickedBoardIds) s.leave(`board:${boardId}`)
  }

  // แจ้งฝั่ง client ของคนถูกเตะ (ทุกแท็บ) ให้จัดการ UI — เด้งออกจากหน้า org
  // และล้าง cache (ห้อง user: ไม่ผูกกับ org จึงยังส่งถึงได้เสมอ)
  io.to(`user:${userId}`).emit("org:removed", { organizationId: orgId })

  // avatar ของเขาต้องหายจาก presence ของบอร์ดที่เคยเปิดให้คนที่เหลือเห็น
  for (const boardId of kickedBoardIds) {
    await broadcastPresence(boardId)
  }
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
