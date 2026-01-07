# アーキテクチャ設計

## プロジェクト構成

```
tailwind-variables-viewer/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
├── .claude/
│   └── rules/
├── docs/
│   ├── architecture.md
│   ├── data-structures.md
│   └── decisions/            # ADR
├── scripts/
│   ├── build.ts              # UIビルドスクリプト
│   ├── dev.ts                # 開発サーバー起動
│   └── lib/
│       └── ui-builder.ts     # Bun.buildラッパー
├── src/
│   ├── cli/
│   │   └── index.ts         # CLIエントリーポイント + Vite dev server
│   ├── core/
│   │   ├── theme-parser.ts  # @themeディレクティブから変数抽出
│   │   ├── extractor.ts     # 変数整理
│   │   └── types.ts         # 型定義
│   └── ui/
│       ├── index.html        # フロントエンド（Vanilla JS）
│       ├── app.ts            # フロントエンドロジック
│       └── app.css           # グローバルスタイル
└── dist/                      # ビルド済みファイル
    ├── cli/                   # tscでビルドされたCLI
    ├── core/                  # tscでビルドされたコア
    └── ui/                    # Bun.buildでビルドされたUI
```

## 技術スタック

### コア依存関係（6個）

- `commander` - CLI引数パース
- `postcss` - CSS AST解析（@theme抽出用）
- `vite` - 開発サーバー（HMR対応）
- `@tailwindcss/vite` - Tailwind CSS v4 Viteプラグイン
- `chokidar` - ファイル監視（ユーザーのCSSファイル変更検知）
- `picocolors` - ターミナル出力の色付け（chalkの軽量代替）

### 開発依存（4個）

- `typescript` - TypeScript本体
- `@types/node` - Node.js型定義
- `@types/bun` - Bun型定義
- `@biomejs/biome` - Linter & Formatter

### 言語・フレームワーク方針

- **TypeScript**: 型安全性と開発体験向上（CLIとライブラリ）
- **Vanilla JS**: フロントエンド（依存関係最小化、標準Web API使用）

## データフロー

```
CLI起動（ユーザーのTailwind CSSファイルを指定）
  ↓
CSSファイル読み込み（@import "tailwindcss" + @theme）
  ↓
PostCSS解析 (src/core/theme-parser.ts)
  ├── Tailwindデフォルト変数読み込み (node_modules/tailwindcss/theme.css)
  └── ユーザーの@themeブロックから変数抽出
  ↓
リセットパターン適用 (--*: initial など)
  ↓
マージ・重複排除
  ↓
変数整理 (src/core/extractor.ts)
  ネームスペース別に分類
  ↓
variables.jsonを静的ファイルとして生成 (dist/ui/api/variables.json)
  ↓
Vite dev server起動 (src/cli/index.ts)
  ├── Tailwind CSS Viteプラグイン適用
  ├── ビルド済みUI配信 (dist/ui/)
  └── chokidarでCSSファイル監視
  ↓
ブラウザでUI表示
  ├── index.html読み込み
  ├── app.ts実行 (Vite HMR対応)
  └── app.css適用 (Vite HMR対応)
  ↓
Vanilla JSでAPI取得とレンダリング
  fetch('/api/variables.json')
  ↓
ユーザーインタラクション
  検索フィルタリング、クリップボードコピー
  ↓
CSSファイル変更時
  ↓
chokidar検知 → 変数再解析 → variables.json更新
  ↓
Vite WebSocketで full-reload 送信
  ↓
ブラウザ自動リロード
```

## 重要な設計思想

### ユーザーの入力

- **入力**: TailwindのエントリーポイントとなるCSSファイル（`app.css`など）
  ```css
  @import "tailwindcss";

  @theme {
    --color-brand-500: oklch(0.65 0.20 200);
    --spacing-custom: 2.5rem;
  }
  ```
- **ユーザーは事前ビルド不要**: ツール内部で解析完結

### 直接パース方式

Tailwindのビルドプロセスを経由せず、CSSファイルを直接解析する方式を採用:

1. `node_modules/tailwindcss/theme.css` からデフォルト変数を読み込み
2. ユーザーの`@theme`ブロックを解析
3. リセットパターン（`--*: initial`など）を適用
4. デフォルトとユーザー変数をマージ・重複排除

### メリット

- **完全な変数表示**: 全375個のデフォルト変数を表示可能
- **高速**: ビルドプロセス不要で10倍以上高速化
- **シンプル**: PostCSS直接解析で実装が単純
- **正確**: リセットパターンの完全サポート

### リセットパターン対応

Tailwind v4の仕様に準拠:

```css
@theme {
  --*: initial;          /* 全変数をリセット */
  --color-*: initial;    /* colorネームスペースのみリセット */
  --color-primary: initial;  /* 特定変数のみリセット */
}
```

## パフォーマンス考慮

- 静的ファイル（variables.json）は変更時のみ再生成
- UIはビルド済みファイルを配信（dist/ui/）
- Vite HMRで高速なフロントエンド開発体験
- chokidarのdebounce設定で不要な再解析を抑制

## ビルドとデプロイ

### ビルドプロセス

```bash
bun run build  # = bun scripts/build.ts && tsc
```

1. **Bun.build** (`scripts/build.ts`)
   - `src/ui/` をバンドル → `dist/ui/`
   - TypeScriptコンパイル、minify、バンドル
   - CSSもバンドルに含める
2. **tsc** (TypeScript Compiler)
   - `src/cli/` と `src/core/` をコンパイル
   - `dist/cli/` と `dist/core/` に出力
   - 型チェックとCommonJS/ESM変換

### 開発モード

```bash
bun run dev  # scripts/dev.ts
```

- `src/ui/` をViteで直接配信
- HMRフル活用
- `dev/sample.css` を監視してテスト用変数を生成
