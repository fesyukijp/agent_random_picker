import { describe, it, expect } from 'vitest'
import { translate } from '../../../src/i18n/translate'
import { ja } from '../../../src/i18n/locales/ja'
import { en } from '../../../src/i18n/locales/en'
import type { TranslationKey } from '../../../src/i18n/locales/ja'

describe('translate', () => {
  it('returns the translation for a known key', () => {
    const result = translate(ja, 'ui.pickButton')
    expect(result).toBe('ランダムピック！')
  })

  it('returns English translation for a known key', () => {
    const result = translate(en, 'ui.pickButton')
    expect(result).toBe('Random Pick!')
  })

  it('interpolates single parameter', () => {
    const result = translate(ja, 'player.defaultName', { n: 3 })
    expect(result).toBe('プレイヤー3')
  })

  it('interpolates multiple parameters', () => {
    const result = translate(ja, 'validation.totalMinExceedsPlayers', {
      totalMin: 4,
      n: 3,
    })
    expect(result).toBe(
      'ロールの最小人数の合計（4人）がプレイヤー数（3人）を超えています。各ロールの最小人数を減らしてください',
    )
  })

  it('returns the key itself for an unknown key', () => {
    const result = translate(ja, 'nonexistent.key' as TranslationKey)
    expect(result).toBe('nonexistent.key')
  })

  it('preserves unreplaced placeholders when params are missing', () => {
    const result = translate(ja, 'player.defaultName')
    expect(result).toBe('プレイヤー{{n}}')
  })

  it('returns unmodified template when params is empty object', () => {
    const result = translate(ja, 'player.defaultName', {})
    expect(result).toBe('プレイヤー{{n}}')
  })

  it('handles string parameter values', () => {
    const result = translate(ja, 'validation.noRolesSelected', {
      name: 'テスト太郎',
    })
    expect(result).toBe('テスト太郎のロールを1つ以上選択してください')
  })
})

describe('locale consistency', () => {
  it('en and ja have identical key sets', () => {
    const jaKeys = Object.keys(ja).sort()
    const enKeys = Object.keys(en).sort()
    expect(enKeys).toEqual(jaKeys)
  })

  it('no translation value is empty string', () => {
    for (const [key, value] of Object.entries(ja)) {
      expect(value, `ja key "${key}" is empty`).not.toBe('')
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en key "${key}" is empty`).not.toBe('')
    }
  })

  it('ja and en have the same placeholders for every key', () => {
    const extractPlaceholders = (str: string) =>
      [...str.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()

    for (const key of Object.keys(ja) as TranslationKey[]) {
      expect(
        extractPlaceholders(en[key]),
        `placeholder mismatch on key "${key}"`,
      ).toEqual(extractPlaceholders(ja[key]))
    }
  })
})
