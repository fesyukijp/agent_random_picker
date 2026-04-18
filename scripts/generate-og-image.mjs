/**
 * OG image generator for Agent Random Picker
 *
 * Output: public/og-image.png (1200×630)
 * Run:    npm run generate-og
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { createRequire } from 'module'
import { readFile, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)

// ── Fonts ────────────────────────────────────────────────────────────────────
// Use createRequire to resolve package path (compatible with pnpm / Yarn PnP)
const fontsDir = path.join(
  path.dirname(require.resolve('@fontsource/barlow-condensed/package.json')),
  'files',
)
GlobalFonts.registerFromPath(
  path.join(fontsDir, 'barlow-condensed-latin-400-normal.woff'),
  'BarlowCondensed',
)
GlobalFonts.registerFromPath(
  path.join(fontsDir, 'barlow-condensed-latin-700-normal.woff'),
  'BarlowCondensed',
)

// ── Design tokens (from index.css) ───────────────────────────────────────────
const C = {
  bgPrimary: '#0f1923',
  bgSurface: '#1a2634',
  accent: '#ff4655',
  textPrimary: '#ece8e1',
  textSecondary: '#9ba9b4',
  textMuted: '#5a6e7a',
  border: '#2d4050',
}

// ── Canvas dimensions ────────────────────────────────────────────────────────
const W = 1200
const H = 630
const SPLIT = 560 // left/right panel boundary

// ── Agent layout (right panel) ───────────────────────────────────────────────
// center agent large, 4 corner agents smaller and semi-transparent
const CENTER_AGENT = { file: 'jett.png', x: 780, y: 170, size: 260, alpha: 1.0 }
const CORNER_AGENTS = [
  { file: 'sova.png',    x: 625,  y: 72,  size: 162, alpha: 0.55 },
  { file: 'reyna.png',   x: 1005, y: 72,  size: 162, alpha: 0.55 },
  { file: 'omen.png',    x: 625,  y: 388, size: 162, alpha: 0.55 },
  { file: 'killjoy.png', x: 1005, y: 388, size: 162, alpha: 0.55 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) throw new Error(`Invalid hex color: "${hex}"`)
  const r = parseInt(match[1].slice(0, 2), 16)
  const g = parseInt(match[1].slice(2, 4), 16)
  const b = parseInt(match[1].slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

async function loadAgentImage(file) {
  const imgPath = path.join(root, 'public/agents', file)
  const buf = await readFile(imgPath).catch((err) => {
    throw new Error(`Agent image not found: ${imgPath}\nRun "npm run fetch:agents" first.`, { cause: err })
  })
  return loadImage(buf)
}

async function main() {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // ── 1. Backgrounds ──────────────────────────────────────────────────────────
  ctx.fillStyle = C.bgPrimary
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = C.bgSurface
  ctx.fillRect(SPLIT, 0, W - SPLIT, H)

  // Gradient at the panel join (right panel left edge → soft shadow)
  const joinGrad = ctx.createLinearGradient(SPLIT, 0, SPLIT + 80, 0)
  joinGrad.addColorStop(0, hexToRgba(C.bgPrimary, 0.7))
  joinGrad.addColorStop(1, hexToRgba(C.bgPrimary, 0))
  ctx.fillStyle = joinGrad
  ctx.fillRect(SPLIT, 0, 80, H)

  // Fade-out on the right edge (crop overflow agents naturally)
  const rightGrad = ctx.createLinearGradient(1090, 0, W, 0)
  rightGrad.addColorStop(0, hexToRgba(C.bgSurface, 0))
  rightGrad.addColorStop(1, hexToRgba(C.bgSurface, 0.85))
  ctx.fillStyle = rightGrad
  ctx.fillRect(1090, 0, W - 1090, H)

  // Fade-out on the bottom edge (crop overflow agents naturally)
  const bottomGrad = ctx.createLinearGradient(0, 520, 0, H)
  bottomGrad.addColorStop(0, hexToRgba(C.bgSurface, 0))
  bottomGrad.addColorStop(1, hexToRgba(C.bgSurface, 0.9))
  ctx.fillStyle = bottomGrad
  ctx.fillRect(SPLIT, 520, W - SPLIT, H - 520)

  // ── 2. Agent images (corners first → behind center) ─────────────────────────
  // Load all images in parallel, then draw in z-order (corners → center)
  const [centerImage, ...cornerImages] = await Promise.all(
    [CENTER_AGENT, ...CORNER_AGENTS].map((agent) => loadAgentImage(agent.file)),
  )

  for (let i = 0; i < CORNER_AGENTS.length; i++) {
    const agent = CORNER_AGENTS[i]
    ctx.save()
    ctx.globalAlpha = agent.alpha
    ctx.drawImage(cornerImages[i], agent.x, agent.y, agent.size, agent.size)
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = CENTER_AGENT.alpha
  ctx.drawImage(centerImage, CENTER_AGENT.x, CENTER_AGENT.y, CENTER_AGENT.size, CENTER_AGENT.size)
  ctx.restore()

  // ── 3. Panel border line ────────────────────────────────────────────────────
  ctx.fillStyle = C.border
  ctx.fillRect(SPLIT, 0, 1, H)

  // ── 4. Left red accent line (Valorant tactical aesthetic) ──────────────────
  ctx.fillStyle = C.accent
  ctx.fillRect(52, 82, 4, H - 164)

  // ── 5. Title: AGENT / RANDOM / PICKER ──────────────────────────────────────
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const titleX = 78
  const lineHeight = 126

  ctx.font = 'bold 108px "BarlowCondensed"'
  ctx.fillStyle = C.accent
  ctx.fillText('AGENT', titleX, 218)

  ctx.fillStyle = C.textPrimary
  ctx.fillText('RANDOM', titleX, 218 + lineHeight)
  ctx.fillText('PICKER', titleX, 218 + lineHeight * 2)

  // ── 6. Divider beneath title ────────────────────────────────────────────────
  ctx.fillStyle = C.accent
  ctx.fillRect(titleX, 490, 36, 2)
  ctx.fillStyle = C.border
  ctx.fillRect(titleX + 42, 491, 180, 1)

  // ── 7. Sub-copy ─────────────────────────────────────────────────────────────
  ctx.font = '500 21px "BarlowCondensed", "Noto Sans JP", sans-serif'
  ctx.fillStyle = C.textPrimary
  ctx.fillText('エージェント選択をランダムにおまかせ。', titleX, 524)

  // ── 8. Feature tags ─────────────────────────────────────────────────────────
  ctx.font = '400 15px "BarlowCondensed", "Noto Sans JP", sans-serif'
  ctx.fillStyle = C.textSecondary
  ctx.fillText(
    'ロール制限  ·  重複禁止  ·  必須/禁止 設定対応',
    titleX,
    554,
  )

  // ── 9. Bottom-right brand mark ──────────────────────────────────────────────
  ctx.save()
  ctx.font = 'bold 12px "BarlowCondensed"'
  ctx.fillStyle = C.textMuted
  ctx.textAlign = 'right'
  ctx.letterSpacing = '2px'
  ctx.fillText('VALORANT FAN TOOL', W - 28, H - 22)
  ctx.restore()

  // ── 10. Write output ─────────────────────────────────────────────────────────
  const outPath = path.join(root, 'public/og-image.png')
  const buf = canvas.toBuffer('image/png')
  await writeFile(outPath, buf)
  console.log(`✓ Generated: ${outPath}`)
  console.log(`  Size: ${(buf.length / 1024).toFixed(1)} KB`)
}

main().catch((err) => {
  console.error('Failed to generate OG image:', err)
  process.exit(1)
})
