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
│   ├── parser.ts          # @themeディレクティブのCSSパーサー
│   ├── extractor.ts       # 変数の抽出・整理
│   ├── server.ts          # Viteプレビューサーバー
│   └── types.ts           # 型定義
├── src/
│   ├── App.svelte         # メインアプリコンポーネント
│   ├── lib/
│   │   ├── VariableCard.svelte    # 変数表示カード
│   │   ├── NamespaceSection.svelte # ネームスペースセクション
│   │   └── SearchBar.svelte        # 検索バー
│   ├── main.ts            # エントリーポイント
│   ├── app.css            # グローバルスタイル
│   └── vite-env.d.ts      # Vite型定義
└── dist/                  # ビルド済みフロントエンド
```

## 技術スタック

### コア依存関係（5個）

- `commander` - CLI引数パース
- `postcss` - CSS AST解析（@theme抽出用）
- `vite` - ビルド＆開発サーバー（preview機能を活用）
- `picocolors` - ターミナル出力の色付け（chalkの軽量代替）
- `open` - ブラウザ自動起動

### 開発依存（4個）

- `typescript` - TypeScript本体
- `@types/node` - Node.js型定義
- `svelte` - Svelteフレームワーク
- `@sveltejs/vite-plugin-svelte` - Vite統合

### 言語・フレームワーク方針

- **TypeScript**: 型安全性と開発体験向上
- **Svelte**: 軽量・高速なUIフレームワーク

## データフロー

```
CLI起動
  ↓
CSSファイル読み込み
  ↓
PostCSS解析 (parser.ts)
  ↓
@themeブロック抽出
  ↓
変数整理・分類 (extractor.ts)
  ↓
Vite preview server起動 (server.ts)
  ↓
API提供 (/api/variables)
  ↓
フロントエンド表示 (src/)
```

## パフォーマンス考慮

- CSS解析結果をメモリキャッシュ
- 静的ファイルはビルド済み配信
- 不要な再解析を避ける
- ポート検索は効率的な範囲で実行
