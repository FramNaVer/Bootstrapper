// =============================================================
// Application Entry Point
// =============================================================
// ประกอบ app อยู่ใน src/app.ts (แยกไว้เพื่อให้ test import ได้)
// ไฟล์นี้ทำหน้าที่เดียว: เปิด server ฟัง request จริง
// =============================================================

import { createServer } from "http"
import { app } from "./src/app"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"
import { initSocket } from "@shared/realtime/socket"
import { initPurgeJob } from "@shared/jobs/purge-expired-data.job"

const PORT = env.PORT

// ห่อ Express ด้วย http server เพื่อแชร์ port เดียวกับ Socket.io
const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`)
  // งานแม่บ้าน DB (ล้าง token หมดอายุ/soft-delete พ้น retention) — ดูรายละเอียดในไฟล์ job
  initPurgeJob()
})
