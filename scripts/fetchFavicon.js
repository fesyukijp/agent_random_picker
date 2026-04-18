#!/usr/bin/env node
/**
 * scripts/fetchFavicon.js
 *
 * valorant-api.com のスパイクアイコン（Standard モード displayIcon）を取得し、
 * ファビコン一式を生成する。Issue #60 ファビコン刷新用。
 *
 * 使い方:
 *   node scripts/fetchFavicon.js            # ファビコン一式を生成
 *   node scripts/fetchFavicon.js --dry-run  # 生成せずに出力ファイルを確認
 *
 * 出力:
 *   public/favicon.svg           モダンブラウザ用 SVG（推奨）
 *   public/favicon.ico           レガシーブラウザ用 ICO（32×32 PNG-in-ICO）
 *   public/apple-touch-icon.png  iOS ホーム画面用 PNG（180×180）
 *
 * 注意:
 *   - Node.js 18 以上 + @napi-rs/canvas が必要
 *   - valorant-api.com の利用は Riot Games Fan Content Policy に基づく
 */

import { createCanvas, loadImage } from '@napi-rs/canvas'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Standard ゲームモードの displayIcon（スパイク）
// UUID: 96bd3920-4f36-d026-2b28-c683eb0bcac5
const SPIKE_ICON_URL =
  'https://media.valorant-api.com/gamemodes/96bd3920-4f36-d026-2b28-c683eb0bcac5/displayicon.png'

const VALORANT_RED = '#FF4655'

const ALLOWED_FAVICON_HOST = 'media.valorant-api.com'

/** URL から画像バッファを取得（HTTPS + ホスト名検証 + 30秒タイムアウト付き） */
async function fetchBuffer(url, timeoutMs = 30_000) {
  if (!/^https:\/\//.test(url)) {
    throw new Error(`安全でない URL スキーマ: ${url}`)
  }
  const parsed = new URL(url)
  if (parsed.hostname !== ALLOWED_FAVICON_HOST) {
    throw new Error(
      `許可されていないホスト名: "${parsed.hostname}" (許可: ${ALLOWED_FAVICON_HOST})`,
    )
  }
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok)
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
    const contentType = res.headers.get('content-type') ?? ''
    // SVG はスクリプトを含みうるため、ラスター画像のみ許可する（fetchAgents.js と同一方針）
    const SAFE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
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

/**
 * スパイクアイコンを赤背景に合成したキャンバスを返す
 * @param {import('@napi-rs/canvas').Image} spikeImage
 * @param {number} size  出力サイズ (px)
 * @param {number} pad   アイコン周囲の余白 (px)
 */
function compositeIcon(spikeImage, size, pad) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // 赤背景
  ctx.fillStyle = VALORANT_RED
  ctx.fillRect(0, 0, size, size)

  // スパイクアイコンを中央に配置
  const iconSize = size - pad * 2
  ctx.drawImage(spikeImage, pad, pad, iconSize, iconSize)

  return canvas
}

/**
 * PNG バッファを単一画像の ICO ファイルに変換する
 * ICO 仕様: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + PNG data
 */
function buildIco(pngBuffer, size) {
  const ENTRY_OFFSET = 6 + 16 // ICONDIR + ICONDIRENTRY 各 1 件
  const buf = Buffer.alloc(ENTRY_OFFSET + pngBuffer.length)
  let pos = 0

  // ICONDIR
  buf.writeUInt16LE(0, pos)
  pos += 2 // reserved
  buf.writeUInt16LE(1, pos)
  pos += 2 // type = 1 (ICO)
  buf.writeUInt16LE(1, pos)
  pos += 2 // count = 1

  // ICONDIRENTRY
  buf.writeUInt8(size === 256 ? 0 : size, pos)
  pos += 1 // width (0 → 256)
  buf.writeUInt8(size === 256 ? 0 : size, pos)
  pos += 1 // height
  buf.writeUInt8(0, pos)
  pos += 1 // colorCount (no palette)
  buf.writeUInt8(0, pos)
  pos += 1 // reserved
  buf.writeUInt16LE(0, pos)
  pos += 2 // planes (PNG-in-ICO では 0 が仕様準拠)
  buf.writeUInt16LE(0, pos)
  pos += 2 // bitCount (PNG-in-ICO では 0 が仕様準拠)
  buf.writeUInt32LE(pngBuffer.length, pos)
  pos += 4 // bytesInRes
  buf.writeUInt32LE(ENTRY_OFFSET, pos)
  pos += 4 // imageOffset

  pngBuffer.copy(buf, pos)
  return buf
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (dryRun) {
    console.log('【ドライラン】ファイル書き込みは実行しません\n')
    console.log('  ソース:')
    console.log(`    ${SPIKE_ICON_URL}\n`)
    console.log('  生成予定:')
    console.log('    public/favicon.svg           (SVG, モダンブラウザ推奨)')
    console.log('    public/favicon.ico           (ICO 32×32, レガシー対応)')
    console.log('    public/apple-touch-icon.png  (PNG 180×180, iOS対応)')
    return
  }

  // ── 1. スパイクアイコンを取得 ──
  console.log('スパイクアイコンを取得中...')
  const spikeBuffer = await fetchBuffer(SPIKE_ICON_URL)
  const spikeImage = await loadImage(spikeBuffer)
  console.log(`  ✓ ${Math.round(spikeBuffer.length / 1024)} KB\n`)

  await mkdir(join(ROOT, 'public'), { recursive: true })

  // ── 2. apple-touch-icon.png (180×180) ──
  process.stdout.write('  生成中  apple-touch-icon.png (180×180) ... ')
  const canvas180 = compositeIcon(spikeImage, 180, 22)
  const buf180 = canvas180.toBuffer('image/png')
  await writeFile(join(ROOT, 'public/apple-touch-icon.png'), buf180)
  console.log(`✓ (${Math.round(buf180.length / 1024)} KB)`)

  // ── 3. favicon.ico (32×32 PNG-in-ICO) ──
  process.stdout.write('  生成中  favicon.ico          (32×32)   ... ')
  const canvas32 = compositeIcon(spikeImage, 32, 4)
  const png32 = canvas32.toBuffer('image/png')
  const icoBuffer = buildIco(png32, 32)
  await writeFile(join(ROOT, 'public/favicon.ico'), icoBuffer)
  console.log(`✓ (${Math.round(icoBuffer.length / 1024)} KB)`)

  // ── 4. favicon.svg (SVG with embedded base64 PNG) ──
  // 赤背景合成済みの 128px PNG を埋め込む（生のスパイク PNG ではなく ICO/apple-touch-icon と同一の合成結果）
  process.stdout.write('  生成中  favicon.svg                    ... ')
  const canvas128 = compositeIcon(spikeImage, 128, 14)
  const png128 = canvas128.toBuffer('image/png')
  const base64Svg = png128.toString('base64')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <image href="data:image/png;base64,${base64Svg}" width="128" height="128"/>
</svg>`
  await writeFile(join(ROOT, 'public/favicon.svg'), svg, 'utf8')
  console.log('✓')

  // ── 5. 結果サマリー ──
  console.log('\n── 完了 ────────────────────────────────────────────────')
  console.log('  public/favicon.svg')
  console.log('  public/favicon.ico')
  console.log('  public/apple-touch-icon.png')
  console.log('───────────────────────────────────────────────────────')
}

main().catch((err) => {
  console.error(
    '\n致命的エラー:',
    err instanceof Error ? err.message : String(err),
  )
  process.exit(1)
})
