import { defineConfig } from "vitest/config"

export default defineConfig({
  // resolve path alias (@shared, @modules, @generated) จาก tsconfig.json
  // ใช้ native support ของ Vite (ไม่ต้องพึ่ง plugin)
  resolve: { tsconfigPaths: true },
  test: {
    // รัน test จาก src/ เท่านั้น ไม่รวม dist/ ที่ compile แล้ว
    include: ["src/**/*.test.ts"],
    // integration test (*.int.test.ts) ต่อ DB จริง → แยกไปรันด้วย vitest.integration.config.ts
    // ไม่รวมที่นี่ เพื่อให้ `npm test` เป็น unit ล้วน รันได้โดยไม่ต้องมี DB
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.int.test.ts"],

    // env สำหรับตอนรันเทสต์ — use case import jwt.util → env.ts ซึ่ง validate
    // environment ตอน boot ถ้าไม่ใส่ตรงนี้ env.ts จะ process.exit(1) แล้วฆ่า test runner
    // ค่าพวกนี้เป็นค่า dummy ที่แค่ทำให้ schema ผ่าน ไม่ได้ต่อ service จริง
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-secret-test-secret-test-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret-test-refresh-secret",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      GOOGLE_CALLBACK_URL: "http://localhost:3000/api/v1/auth/google/callback",
      GITHUB_CLIENT_ID: "test-github-client-id",
      GITHUB_CLIENT_SECRET: "test-github-client-secret",
      GITHUB_CALLBACK_URL: "http://localhost:3000/api/v1/auth/github/callback",
    },
  },
})
