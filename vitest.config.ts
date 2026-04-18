import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    // tsconfig.test.json は src と tests 両方を include するため、
    // テストファイルの型チェックもアプリと同等の strict 設定で実行される
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/env.d.ts', 'src/main.tsx'],
    },
  },
})
