# Tailwind CSS Theme Variables Viewer

Tailwind CSS v4のテーマ変数をブラウザで表示するCLIツールです。

TailwindのエントリーポイントとなるCSSファイル（`@import "tailwindcss"` + `@theme`）を指定するだけで、テーマ変数をPostCSSで解析してインタラクティブに表示します。

ビルドプロセスは不要で、高速・シンプルに起動します。

## 機能

- Tailwind CSS v4の`@theme`変数を自動抽出
- PostCSSで直接変数を解析（高速・シンプル）
- ネームスペース別に変数を整理（color, spacing, fontなど）
- カラー、サイズ、フォントのビジュアルプレビュー
- 変数の検索・フィルタリング
- 変数名をクリップボードにコピー
- 最小限の依存関係（コア5個のみ）
- リセットパターン対応（`--color-*: initial;` など）

## インストール

```bash
npm install -g tailwind-variables-viewer
```

またはnpxで直接実行:

```bash
npx tailwind-variables-viewer -c ./src/app.css
```

## 使い方

### 基本的な使い方

```bash
tailwind-variables-viewer -c ./src/app.css
```

### カスタムポート指定

```bash
tailwind-variables-viewer -c ./src/app.css -p 3001
```

### ブラウザ自動起動

```bash
tailwind-variables-viewer -c ./src/app.css -o
```

## オプション

| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|-----------|
| `--config <path>` | `-c` | Tailwind CSSエントリーポイント | 必須 |
| `--port <number>` | `-p` | ポート番号 | 3000 |
| `--open` | `-o` | ブラウザを自動起動 | false |
| `--help` | `-h` | ヘルプを表示 | - |
| `--version` | `-v` | バージョンを表示 | - |

## 入力CSSの例

TailwindのエントリーポイントとなるCSSファイル:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.65 0.20 200);
  --color-brand-600: oklch(0.55 0.18 200);
  --spacing-custom: 2.5rem;
  --font-brand: "Custom Font", sans-serif;
}
```

## 仕組み

1. 指定されたCSSファイルから`@theme`変数を抽出（PostCSS）
2. `@import "tailwindcss"` が指定されている場合、デフォルト変数を読み込み
3. リセットパターン（`--color-*: initial`など）を適用
4. 変数をネームスペース別に整理
5. Vite preview serverで配信し、ブラウザで視覚的に表示

> **高速化**: 従来のビルドプロセスを廃止し、PostCSS直接解析により起動時間を大幅削減（~0.5秒）

## 開発

```bash
# 依存関係のインストール
bun install

# CLIのビルド
bun run build:cli

# フロントエンドのビルド
bun run build

# 開発モード（フロントエンドのみ）
bun run dev
```

## ライセンス

MIT
