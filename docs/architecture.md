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
├── docs/                    # プロジェクトドキュメント
│   ├── architecture.md
│   ├── data-structures.md
│   └── decisions/          # ADR
├── cli/
│   └── index.ts            # CLIエントリーポイント
├── lib/
│   ├── theme-parser.ts     # @themeディレクティブから変数抽出
│   ├── extractor.ts        # 変数整理
│   ├── server.ts           # Viteプレビューサーバー
│   └── types.ts            # 型定義
├── src/
│   ├── index.html          # フロントエンド（Vanilla JS）
│   └── app.css             # グローバルスタイル
└── dist/                    # ビルド済みフロントエンド
```

## 技術スタック

### コア依存関係（5個）

- `commander` - CLI引数パース
- `postcss` - CSS AST解析（@theme抽出用）
- `vite` - ビルド＆開発サーバー（preview機能を活用）
- `picocolors` - ターミナル出力の色付け（chalkの軽量代替）
- `open` - ブラウザ自動起動

### 開発依存（2個）

- `typescript` - TypeScript本体
- `@types/node` - Node.js型定義

### 言語・フレームワーク方針

- **TypeScript**: 型安全性と開発体験向上（CLIとライブラリ）
- **Vanilla JS**: フロントエンド（依存関係最小化、標準Web API使用）

## データフロー

```
CLI起動（ユーザーのTailwind CSSファイルを指定）
  ↓
CSSファイル読み込み（@import "tailwindcss" + @theme）
  ↓
PostCSS解析 (theme-parser.ts)
  ├── Tailwindデフォルト変数読み込み (node_modules/tailwindcss/theme.css)
  └── ユーザーの@themeブロックから変数抽出
  ↓
リセットパターン適用 (--*: initial など)
  ↓
マージ・重複排除
  ↓
変数整理 (extractor.ts)
  ネームスペース別に分類
  ↓
Vite preview server起動 (server.ts)
  ↓
静的ファイル配信 (dist/)
  index.html + app.css
  ↓
Vanilla JSでAPI取得とレンダリング
  fetch('/api/variables')
  ↓
ユーザーインタラクション
  検索フィルタリング、クリップボードコピー
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

- CSS解析結果をメモリキャッシュ
- 静的ファイルはビルド済み配信
- 不要な再解析を避ける
- ポート検索は効率的な範囲で実行
