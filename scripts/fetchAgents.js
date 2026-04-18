#!/usr/bin/env node
/**
 * scripts/fetchAgents.js
 *
 * valorant-api.com からエージェント画像をダウンロードし public/agents/ に保存する。
 * 初回実行後、src/data/agents.ts の imageUrl を .webp → .png に自動更新する。
 *
 * 使い方:
 *   node scripts/fetchAgents.js            # 未ダウンロードの画像のみ取得
 *   node scripts/fetchAgents.js --force    # 既存ファイルも上書き再取得
 *   node scripts/fetchAgents.js --dry-run  # ダウンロードせずに対象を確認
 *
 * 注意:
 *   - Node.js 18 以上が必要（fetch, fs/promises を使用）
 *   - valorant-api.com の利用は Riot Games Fan Content Policy に基づく
 */

import { writeFile, mkdir, readFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(ROOT, 'public', 'agents')
const AGENTS_TS_PATH = join(ROOT, 'src', 'data', 'agents.ts')
const API_URL = 'https://valorant-api.com/v1/agents?isPlayableCharacter=true'

// valorant-api.com の displayName → 内部 ID マッピング
// API は英語名を返すため、各エージェントの英語表記と内部 ID を対応させる
const NAME_TO_ID = {
  Jett: 'jett',
  Phoenix: 'phoenix',
  Raze: 'raze',
  Reyna: 'reyna',
  Yoru: 'yoru',
  Neon: 'neon',
  Iso: 'iso',
  Waylay: 'waylay',
  Sova: 'sova',
  Breach: 'breach',
  Skye: 'skye',
  'KAY/O': 'kayo',
  Fade: 'fade',
  Gekko: 'gekko',
  Tejo: 'tejo',
  Brimstone: 'brimstone',
  Viper: 'viper',
  Omen: 'omen',
  Astra: 'astra',
  Harbor: 'harbor',
  Clove: 'clove',
  Sage: 'sage',
  Cypher: 'cypher',
  Killjoy: 'killjoy',
  Chamber: 'chamber',
  Deadlock: 'deadlock',
  Vyse: 'vyse',
  Veto: 'veto',
  Miks: 'miks',
}

/** ファイルが存在するか確認（Promise ベースで例外を制御フローに使わない） */
function fileExists(path) {
  return access(path).then(
    () => true,
    () => false,
  )
}

/**
 * displayName に含まれる ANSI エスケープシーケンスや制御文字を除去する。
 * ターミナルへの出力に使用するため、ANSI Injection を防ぐ。
 */
function sanitizeForLog(str) {
  // ESC シーケンス（\x1B[...m 等）と C0/C1 制御文字（改行・タブ除く）を除去
  /* eslint-disable no-control-regex */
  return str
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
  /* eslint-enable no-control-regex */
}

const ALLOWED_IMAGE_HOST = 'media.valorant-api.com'

// SVG はスクリプトを含みうるため、ラスター画像のみ許可する
const SAFE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** URL から画像をダウンロードしてバッファを返す（HTTPS + ホスト名検証 + 30秒タイムアウト付き） */
async function fetchImage(url, timeoutMs = 30_000) {
  if (!/^https:\/\//.test(url)) {
    throw new Error(`安全でない URL スキーマ: ${url}`)
  }
  const parsed = new URL(url)
  if (parsed.hostname !== ALLOWED_IMAGE_HOST) {
    throw new Error(
      `許可されていないホスト名: "${parsed.hostname}" (許可: ${ALLOWED_IMAGE_HOST})`,
    )
  }
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!SAFE_IMAGE_TYPES.some((t) => contentType.startsWith(t))) {
      throw new Error(
        `許可されていない Content-Type: "${contentType}" — ${url}`,
      )
    }
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(id)
  }
}

/** agents.ts の imageUrl 拡張子を .webp → .png に書き換える */
async function patchAgentsTs() {
  const source = await readFile(AGENTS_TS_PATH, 'utf8')
  const patched = source.replace(/(`\/agents\/\$\{id\})\.webp`/g, '$1.png`')
  if (patched === source) {
    return false // 変更なし
  }
  await writeFile(AGENTS_TS_PATH, patched, 'utf8')
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const dryRun = args.includes('--dry-run')

  if (dryRun) {
    console.log('【ドライラン】ダウンロードは実行しません\n')
  }

  // ── 1. API からエージェント一覧を取得 ──
  console.log('valorant-api.com からエージェントデータを取得中...')
  const apiController = new AbortController()
  const apiTimeoutId = setTimeout(() => apiController.abort(), 30_000)
  let res
  try {
    res = await fetch(API_URL, { signal: apiController.signal })
  } finally {
    clearTimeout(apiTimeoutId)
  }
  if (!res.ok) {
    throw new Error(`API 呼び出し失敗: HTTP ${res.status}`)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(`API レスポンスの Content-Type が不正: "${contentType}"`)
  }
  const json = await res.json()
  if (!Array.isArray(json?.data)) {
    throw new Error(
      `API レスポンス形式が不正: "data" フィールドが配列ではありません`,
    )
  }
  const agents = json.data
  console.log(`  ${agents.length} 件のエージェントを取得しました\n`)

  // ── 2. 出力ディレクトリを準備 ──
  if (!dryRun) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  // ── 3. 各エージェントの画像をダウンロード ──
  const results = { downloaded: [], skipped: [], failed: [], unmapped: [] }
  const downloadTasks = []

  // マッピング済みエージェントの存在チェックを並行実行
  const mappedAgents = []
  for (const agent of agents) {
    if (typeof agent.displayName !== 'string') {
      console.warn(
        `  警告: agent.displayName が文字列ではありません: ${JSON.stringify(agent.displayName)}`,
      )
      continue
    }
    if (Object.hasOwn(NAME_TO_ID, agent.displayName)) {
      mappedAgents.push(agent)
    }
  }
  const existsResults = await Promise.all(
    mappedAgents.map((a) =>
      fileExists(join(OUTPUT_DIR, `${NAME_TO_ID[a.displayName]}.png`)),
    ),
  )
  const existsMap = new Map(
    mappedAgents.map((a, i) => [NAME_TO_ID[a.displayName], existsResults[i]]),
  )

  for (const agent of agents) {
    if (typeof agent.displayName !== 'string') continue
    // prototype chain guard: __proto__ / constructor 等のプロトタイプキーを除外
    const id = Object.hasOwn(NAME_TO_ID, agent.displayName)
      ? NAME_TO_ID[agent.displayName]
      : undefined

    if (!id) {
      results.unmapped.push(agent.displayName)
      continue
    }

    const outputPath = join(OUTPUT_DIR, `${id}.png`)
    const exists = existsMap.get(id) ?? false

    if (exists && !force) {
      console.log(
        `  スキップ  ${sanitizeForLog(agent.displayName).padEnd(12)} → ${id}.png (既存)`,
      )
      results.skipped.push(id)
      continue
    }

    // 画像 URL: displayIconSmall（〜128px）か displayIcon（〜512px）を使用
    // displayIcon のほうが高解像度だが容量が大きい
    const imageUrl = agent.displayIcon ?? agent.displayIconSmall
    if (!imageUrl) {
      console.warn(
        `  警告      ${sanitizeForLog(agent.displayName)}: 画像 URL が見つかりません`,
      )
      results.failed.push(id)
      continue
    }

    if (dryRun) {
      console.log(
        `  取得予定  ${sanitizeForLog(agent.displayName).padEnd(12)} → ${id}.png`,
      )
      console.log(`            ${imageUrl}`)
      results.downloaded.push(id)
      continue
    }

    downloadTasks.push({ id, agent, outputPath, imageUrl })
  }

  // 画像ダウンロード（並行: 最大5件ずつバッチ処理）
  const CONCURRENCY = 5
  for (let i = 0; i < downloadTasks.length; i += CONCURRENCY) {
    const batch = downloadTasks.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(async ({ id, outputPath, imageUrl }) => {
        const buffer = await fetchImage(imageUrl)
        await writeFile(outputPath, buffer)
        return { id, size: buffer.length }
      }),
    )
    for (const [idx, settledResult] of settled.entries()) {
      const task = batch[idx]
      if (settledResult.status === 'fulfilled') {
        console.log(
          `  ✓ ${sanitizeForLog(task.agent.displayName).padEnd(12)} → ${task.id}.png (${Math.round(settledResult.value.size / 1024)} KB)`,
        )
        results.downloaded.push(task.id)
      } else {
        const errMsg =
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : String(settledResult.reason)
        console.error(
          `  ✗ ${sanitizeForLog(task.agent.displayName).padEnd(12)} → ${errMsg}`,
        )
        results.failed.push(task.id)
      }
    }
  }

  // ── 4. agents.ts の imageUrl を更新 ──
  if (!dryRun && results.downloaded.length > 0) {
    console.log('\nsrc/data/agents.ts を更新中...')
    const changed = await patchAgentsTs()
    if (changed) {
      console.log('  ✓ imageUrl を .webp → .png に変更しました')
    } else {
      console.log('  ℹ  agents.ts は既に最新状態です (.png)')
    }
  }

  // ── 5. 結果サマリー ──
  console.log('\n── 結果 ──────────────────────────────────────')
  console.log(`  ダウンロード完了: ${results.downloaded.length} 体`)
  console.log(`  スキップ（既存）: ${results.skipped.length} 体`)
  if (results.failed.length > 0) {
    console.warn(
      `  失敗:             ${results.failed.length} 体 — ${results.failed.join(', ')}`,
    )
  }
  if (results.unmapped.length > 0) {
    console.warn('\n  マッピング未定義（agents.ts に未登録のエージェント）:')
    for (const name of results.unmapped) {
      console.warn(`    - ${name}`)
    }
    console.warn('\n  新エージェントを追加する場合は scripts/fetchAgents.js の')
    console.warn('  NAME_TO_ID と src/data/agents.ts を更新してください。')
  }
  console.log('───────────────────────────────────────────────')

  if (results.failed.length > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(
    '\n致命的エラー:',
    err instanceof Error ? err.message : String(err),
  )
  process.exit(1)
})
