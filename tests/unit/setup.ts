import { beforeEach } from 'vitest'

// Vitest Node 環境向け localStorage モック
const _storage: Record<string, string | undefined> = {}

const localStorageMock: Storage = {
  getItem: (key: string): string | null => _storage[key] ?? null,
  setItem: (key: string, value: string): void => {
    _storage[key] = value
  },
  removeItem: (key: string): void => {
    delete _storage[key]
  },
  clear: (): void => {
    Object.keys(_storage).forEach((k) => delete _storage[k])
  },
  get length(): number {
    return Object.keys(_storage).length
  },
  key: (index: number): string | null => Object.keys(_storage)[index] ?? null,
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

// 各テストファイル実行前に localStorage をクリアし、テスト間の状態漏洩を防止
beforeEach(() => {
  localStorageMock.clear()
})
