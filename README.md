# Tailwind CSS Theme Variables Viewer

Tailwind CSS v4のテーマ変数をブラウザで表示するCLIツールです。

TailwindのエントリーポイントとなるCSSファイル（`@import "tailwindcss"` + `@theme`）を指定するだけで、ツール内部でビルドを実行し、テーマ変数をインタラクティブに表示します。

## 機能

- Tailwind CSS v4の`@theme`変数を自動抽出
- ツール内部でTailwindビルドを実行（ユーザーの事前ビルド不要）
- ネームスペース別に変数を整理（color, spacing, fontなど）
- カラー、サイズ、フォントのビジュアルプレビュー
- 変数の検索・フィルタリング
- 変数名をクリップボードにコピー
- 最小限の依存関係

## インストール

```bash
npm install -g tailwind-variables-viewer
```

またはnpxで直接実行:

```bash
npx tailwind-variables-viewer -c ./src/app.css
```

## 使い方

**重要**: TailwindのエントリーポイントとなるCSSファイルを指定してください。ツールが自動的にビルドを実行します。

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

1. 指定されたCSSファイルから`@theme`変数を抽出
2. 各変数に対応するTailwindクラスを含むHTMLを生成
3. `@tailwindcss/cli`でビルドを実行
4. 生成されたCSSから実際の変数値を解析
5. ブラウザで視覚的に表示

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
