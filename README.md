# VALORANT Agent Random Picker

VALORANT のエージェント選択に迷ったときに使える、条件付きランダムピッカー。1〜5 人のパーティーに対応し、ロール制限・エージェント制約・重複制御などの細かな条件を満たしつつ、一様な確率でエージェントをランダム選択する。

## 主な機能

- **ランダムピック** — ワンクリックで全プレイヤーのエージェントを一括ランダム選択
- **個人設定** — プレイヤーごとにロール（デュエリスト/イニシエーター/コントローラー/センチネル）やエージェントの希望・除外を設定
- **全体設定** — パーティー全体でのエージェント重複許可、ロール人数制限、エージェント必須・除外（三段階切替）
- **再抽選** — 全体再抽選と、特定プレイヤーのみの個別再抽選
- **発表演出** — スタックリスト型の順次発表アニメーション
- **設定永続化** — ブラウザの localStorage に自動保存・復元
- **レスポンシブ** — PC・モバイル両対応

## 使用技術

| カテゴリ       | 技術                 |
| -------------- | -------------------- |
| フレームワーク | React 19, TypeScript |
| ビルド         | Vite 7               |
| CSS            | Tailwind CSS v4      |
| 状態管理       | Zustand              |
| テスト（単体） | Vitest               |
| テスト（E2E）  | Playwright           |
| Lint / Format  | ESLint, Prettier     |
| Git Hooks      | lefthook             |

## セットアップ

```bash
npm install
```

### 開発サーバー

```bash
npm run dev
```

### テスト

```bash
# 単体テスト
npm test

# 単体テスト（ウォッチモード）
npm run test:watch

# E2E テスト
npm run e2e

# E2E テスト（UI モード）
npm run e2e:ui
```

### ビルド

```bash
npm run build
npm run preview   # ビルド成果物のプレビュー
```

### その他

```bash
npm run lint          # ESLint 実行
npm run format        # Prettier でフォーマット
npm run format:check  # フォーマットチェック
npm run typecheck     # TypeScript 型チェック
```
