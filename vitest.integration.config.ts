import "dotenv/config"
import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Integration test config — ต่อ DB จริง
//
// รันด้วย: npm run test:integration
//
// ถ้าตั้ง TEST_DATABASE_URL ไว้ (ดู .env.example) เทสต์จะใช้ DB นั้นแทน
// DATABASE_URL ปกติ — แยกขาดจาก DB dev/prod เพราะเทสต์สร้าง/ลบข้อมูลจริง
// (เคยมี user ตกค้างจากเทสต์ปนใน DB ที่แชร์กับ prod มาแล้ว)
// กลไก: test.env ตั้งค่าเข้า process.env ก่อนเทสต์โหลด และ dotenv ใน env.ts
// ไม่ทับค่าที่มีอยู่แล้ว → ค่า override นี้ชนะเสมอ
export default defineConfig({
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@modules": fileURLToPath(new URL("./src/modules", import.meta.url)),
      "@generated": fileURLToPath(new URL("./generated", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.int.test.ts"],
    env: {
      ...(process.env.TEST_DATABASE_URL
        ? { DATABASE_URL: process.env.TEST_DATABASE_URL }
        : {}),
    },
    // ต่อ DB ทีละ request ตามลำดับ — กัน test แย่ง state กัน
    fileParallelism: false,
    // integration ใช้เวลานานกว่า unit (network round-trip ไป DB)
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
