import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // E2E テストは日本語ロケールで実行する（i18n 自動検出が ja を選択）。
    // 英語 UI のテストは別プロジェクトで追加可能。
    locale: 'ja-JP',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // E2E テストは DEV ビルド（npm run dev）が必須。
  // main.tsx が import.meta.env.DEV 時のみ window.__stores__ を公開しており、
  // 一部テスト（E2E-PICK-004, E2E-DEAD-001）がストア直接操作に依存している。
  // プロダクションビルド（npm run build && npm run preview）では __stores__ が
  // undefined になりテストが失敗する。
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
