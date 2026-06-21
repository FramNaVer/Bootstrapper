import { defineConfig } from "vitest/config"

// Integration test config — ต่อ DB จริง (อ่านค่าจาก .env ผ่าน dotenv ใน env.ts)
// ต่างจาก unit config: ไม่ override DATABASE_URL ด้วยค่า dummy
//
// รันด้วย: npm run test:integration
// แนะนำให้ตั้ง DATABASE_URL ใน .env ชี้ไป "test database" แยกต่างหาก
// เพราะเทสต์จะสร้าง/ลบข้อมูลจริง (มี cleanup ใน afterAll แต่กันพลาดไว้ดีกว่า)
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.int.test.ts"],
    // ต่อ DB ทีละ request ตามลำดับ — กัน test แย่ง state กัน
    fileParallelism: false,
    // integration ใช้เวลานานกว่า unit (network round-trip ไป Neon)
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
