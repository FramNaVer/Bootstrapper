// =============================================================
// Application Entry Point
// =============================================================
// ประกอบ app อยู่ใน src/app.ts (แยกไว้เพื่อให้ test import ได้)
// ไฟล์นี้ทำหน้าที่เดียว: เปิด server ฟัง request จริง
// =============================================================

import { app } from "./src/app"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"

const PORT = env.PORT

app.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`)
})
