# アーキテクチャ設計

## プロジェクト構成

```
tailwind-variables-viewer/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
├── .claude/
│   └── rules/              # プロジェクトドキュメント
├── cli/
│   └── index.ts           # CLIエントリーポイント
├── lib/
│   ├── theme-parser.ts    # @themeディレクティブから変数抽出
│   ├── html-generator.ts  # 変数に対応するHTML+クラス名生成
│   ├── builder.ts         # @tailwindcss/cli実行
│   ├── server.ts          # Viteプレビューサーバー
│   └── types.ts           # 型定義
├── src/
│   ├── index.html         # フロントエンド（Vanilla JS）
│   └── app.css            # グローバルスタイル
├── dist/                  # ビルド済みフロントエンド
└── .tmp/                  # 一時ビルドファイル（gitignore）
    ├── preview.html       # 生成されたHTMLプレビュー
    └── preview.css        # TailwindでビルドされたCSS
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

> **注**: 当初Svelte 5を採用したが、ADR-002により Vanilla JSに変更。
> 理由: 実装機能がシンプル、依存関係削減、保守性向上。

## データフロー

```
CLI起動（ユーザーのTailwind CSSファイルを指定）
  ↓
CSSファイル読み込み（@import "tailwindcss" + @theme）
  ↓
PostCSS解析 (theme-parser.ts)
  ↓
@themeブロックから変数抽出
  ↓
HTML生成 (html-generator.ts)
  各変数に対応するTailwindクラスを含むHTML
  例: --color-red-500 → <div class="bg-red-500">
  ↓
Tailwindビルド実行 (builder.ts)
  @tailwindcss/cli で .tmp/preview.html → .tmp/preview.css
  ↓
生成されたCSSから変数抽出
  :rootブロックを解析して実際の値を取得
  ↓
Vite preview server起動 (server.ts)
  ↓
静的ファイル配信 (dist/)
  index.html + app.css
  ↓
Vanilla JSでAPI取得とレンダリング
  fetch('/api/variables.json')
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

- **ユーザーは事前ビルド不要**: ツール内部でTailwindをビルド

### Tailwindのクラス名スキャン機構の活用

Tailwind CSS v4はHTMLをスキャンしてクラス名を検出し、必要なCSSのみを生成します。
このツールはこの仕組みを活用:

1. ユーザーの`@theme`から変数を抽出
2. 各変数に対応するTailwindクラスを含むHTMLを生成
3. Tailwindでビルド → 実際に使用される変数のみがCSSに出力
4. 生成されたCSSから`:root`を解析して変数値を取得

### メリット

- **正確性**: Tailwindが実際に使用する変数のみを表示
- **リアルタイム**: 設定変更時に再ビルド可能
- **シンプル**: ユーザーは設定ファイルを指定するだけ

### 生成されたCSSの再利用

このツールは生成された `.tmp/preview.css` を二重に活用します：

1. **変数メタデータの抽出**（parser.ts, extractor.ts）
   - `:root` ブロックから変数名と値のリストを取得
   - ネームスペース別に整理（color, spacing, fontなど）
   - APIとして `/api/variables` で提供

2. **ビューワーでの直接利用**
   - 生成されたユーティリティクラス（`.bg-primary`, `.text-secondary`など）をそのまま使用
   - カラースウォッチやサイズプレビューは実際のTailwindクラスで表示
   - 自前でスタイルを実装する必要がない

```svelte
<!-- ビューワーUI例 -->
<link rel="stylesheet" href="/.tmp/preview.css" />

{#each variables as variable}
  <div class="variable-card">
    <!-- メタデータ表示 (parser/extractorで取得) -->
    <code>{variable.varName}</code>     <!-- --color-primary -->
    <code>{variable.value}</code>        <!-- oklch(0.5 0.2 240) -->

    <!-- 実際のTailwindクラスを使用 (preview.cssから) -->
    <div class="bg-{variable.name} w-10 h-10"></div>  <!-- bg-primary -->
  </div>
{/each}
```

**なぜこの設計？**
- ✅ 生成されたCSSを無駄なく活用
- ✅ 実際の見た目が正確に反映される
- ✅ ビューワー用に別途CSSを書く必要がない
- ✅ Tailwindの出力がそのまま使える

## パフォーマンス考慮

- CSS解析結果をメモリキャッシュ
- 静的ファイルはビルド済み配信
- 不要な再解析を避ける
- ポート検索は効率的な範囲で実行
