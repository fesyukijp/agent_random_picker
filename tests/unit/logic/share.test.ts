import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  buildXShareUrl,
  X_CHAR_LIMIT,
  X_URL_COST,
  getXWeightedLength,
} from '../../../src/logic/share'
import type { Agent, PickResult } from '../../../src/logic/types'
import { makePlayer } from '../helpers/logicHelpers'

const makeAgent = (id: string, name: string): Agent => ({
  id,
  name,
  roleId: 'duelist',
  imageUrl: `/agents/${id}.png`,
})

const makeResult = (playerId: string, agent: Agent): PickResult => ({
  playerId,
  agent,
})

describe('buildXShareUrl', () => {
  it('results が null のとき null を返す', () => {
    const players = [makePlayer('p1')]
    expect(buildXShareUrl(players, null)).toBeNull()
  })

  it('1人・デフォルト名のとき P1 でシェアテキストを生成する', () => {
    const players = [makePlayer('p1')]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)

    expect(url).not.toBeNull()
    const decoded = decodeURIComponent(url!)
    expect(decoded).toContain('・プレイヤー1: ジェット')
    expect(decoded).toContain('#VALORANT #ヴァロラント')
  })

  it('カスタム名が設定されているとき、その名前を使う', () => {
    const players = [makePlayer('p1', { name: 'ゆーざー' })]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    expect(decodeURIComponent(url)).toContain('・ゆーざー: ジェット')
  })

  it('5人フル・全員デフォルト名のとき全プレイヤーが含まれる', () => {
    const agents = ['jett', 'sova', 'viper', 'cypher', 'gekko'].map((id, i) =>
      makeAgent(id, `エージェント${i + 1}`),
    )
    const players = agents.map((_, i) => makePlayer(`p${i + 1}`))
    const results = players.map((p, i) => makeResult(p.id, agents[i]))

    const url = buildXShareUrl(players, results)!
    const decoded = decodeURIComponent(url)

    for (let i = 1; i <= 5; i++) {
      expect(decoded).toContain(`プレイヤー${i}`)
    }
  })

  it('プレイヤー名に特殊文字（& #）が含まれても URL エンコードされる', () => {
    const players = [makePlayer('p1', { name: 'ユーザー&名前' })]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    expect(url).toContain(encodeURIComponent('ユーザー&名前'))
  })

  it('対応する result が見つからないプレイヤーは「？」になる', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    const decoded = decodeURIComponent(url)
    expect(decoded).toContain('プレイヤー2: ？')
  })

  it('重み付き文字数がテキスト予算を超えるとき省略記号で切り詰める', () => {
    // 'あ' (U+3042) は X の重み 2 なので 50 文字 × 5 人 × 2 = 500 ウェイト分で確実に超過
    const longName = 'あ'.repeat(50)
    const players = Array.from({ length: 5 }, (_, i) =>
      makePlayer(`p${i + 1}`, { name: longName }),
    )
    const results = players.map((p) =>
      makeResult(p.id, makeAgent('jett', 'ジェット')),
    )

    const url = buildXShareUrl(players, results)!
    const textParam = new URLSearchParams(url.split('?')[1]).get('text')
    if (!textParam) throw new Error('text param not found')

    const textBudget = X_CHAR_LIMIT - X_URL_COST
    expect(getXWeightedLength(textParam)).toBeLessThanOrEqual(textBudget)
    expect(textParam.endsWith('…')).toBe(true)
  })

  it('生成される URL が x.com/intent/tweet を指している', () => {
    const players = [makePlayer('p1')]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    expect(url).toMatch(/^https:\/\/x\.com\/intent\/tweet/)
  })

  it('url パラメータが含まれている', () => {
    const players = [makePlayer('p1')]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    expect(url).toContain('&url=')
  })
})

// M-09: getXWeightedLength CJK 境界ケース
describe('getXWeightedLength CJK 境界ケース', () => {
  it('CJK文字は重み2でカウントされる', () => {
    expect(getXWeightedLength('あ')).toBe(2)
    expect(getXWeightedLength('漢')).toBe(2)
  })

  it('ASCII文字は重み1でカウントされる', () => {
    expect(getXWeightedLength('a')).toBe(1)
    expect(getXWeightedLength('abc')).toBe(3)
  })

  it('省略記号 … (U+2026) は重み1', () => {
    expect(getXWeightedLength('…')).toBe(1)
  })

  it('全角スペース (U+3000) は重み2', () => {
    expect(getXWeightedLength('\u3000')).toBe(2)
  })

  it('CJK + ASCII 混合の重みが正しい', () => {
    // 'あa' = 2 + 1 = 3
    expect(getXWeightedLength('あa')).toBe(3)
    // 'aあa' = 1 + 2 + 1 = 4
    expect(getXWeightedLength('aあa')).toBe(4)
  })

  it('空文字列は重み0', () => {
    expect(getXWeightedLength('')).toBe(0)
  })

  it('CJK文字のみで省略記号付加時の重みが予算内に収まる', () => {
    // 切り詰め後: CJK文字列 + '…' の重みが元の予算以下であることを
    // buildXShareUrl 経由で間接検証
    const longCjkName = 'あ'.repeat(100)
    const players = Array.from({ length: 5 }, (_, i) =>
      makePlayer(`p${i + 1}`, { name: longCjkName }),
    )
    const results = players.map((p) =>
      makeResult(p.id, makeAgent('jett', 'ジェット')),
    )

    const url = buildXShareUrl(players, results)
    if (!url) throw new Error('url should not be null')
    const textParam = new URLSearchParams(url.split('?')[1]).get('text')
    if (!textParam) throw new Error('text param not found')

    const weight = getXWeightedLength(textParam)
    const textBudget = X_CHAR_LIMIT - X_URL_COST
    expect(weight).toBeLessThanOrEqual(textBudget)
    expect(textParam.endsWith('…')).toBe(true)
  })
})

// HIGH-3: VITE_APP_URL ホスト名 allowlist 検証
describe('getAppUrl のセキュリティ検証（VITE_APP_URL）', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('HIGH-3-1: VITE_APP_URL に許可されていないホストが設定された場合、そのURLを url パラメータに使用しない', () => {
    vi.stubEnv('VITE_APP_URL', 'https://evil.example.com/app')
    const players = [makePlayer('p1')]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    const urlParam = new URLSearchParams(url.split('?')[1]).get('url')

    expect(decodeURIComponent(urlParam ?? '')).not.toContain('evil.example.com')
  })

  it('HIGH-3-2: VITE_APP_URL が javascript: スキーマの場合、そのURLを url パラメータに使用しない', () => {
    vi.stubEnv('VITE_APP_URL', 'javascript:alert(1)')
    const players = [makePlayer('p1')]
    const results = [makeResult('p1', makeAgent('jett', 'ジェット'))]

    const url = buildXShareUrl(players, results)!
    expect(url).not.toContain('javascript:')
  })
})
