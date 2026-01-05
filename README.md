# Tailwind CSS Theme Variables Viewer

Tailwind CSS v4のテーマ変数をブラウザで表示するCLIツールです。

CSSファイルから`@theme`ディレクティブを解析し、インタラクティブなWebインターフェースで表示します。

## 機能

- Tailwind CSS v4の`@theme`ディレクティブを解析
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

### 基本的な使い方

```bash
tailwind-variables-viewer -c ./src/app.css
```

### 複数のCSSファイルを指定

```bash
tailwind-variables-viewer -c ./src/base.css -c ./src/theme.css
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
| `--config <path...>` | `-c` | @themeディレクティブを含むCSSファイル | 必須 |
| `--port <number>` | `-p` | ポート番号 | 3000 |
| `--open` | `-o` | ブラウザを自動起動 | false |
| `--help` | `-h` | ヘルプを表示 | - |
| `--version` | `-v` | バージョンを表示 | - |

## CSSの例

```css
@theme {
  --color-primary: oklch(0.5 0.2 240);
  --color-secondary: oklch(0.6 0.15 180);
  --spacing-4: 1rem;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

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
