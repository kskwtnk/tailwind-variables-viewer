# ADR-001: 技術スタック選定（2026年1月5日）

## 状態
採用

## コンテキスト
Tailwind CSS v4の`@theme`ディレクティブで定義されたテーマ変数を可視化するCLIツールを開発する。参考: [tailwind-config-viewer](https://github.com/rogden/tailwind-config-viewer/)（v3のみ対応）

**要件**:
- CLIツール形式（`npx tailwind-variables-viewer`で実行可能）
- 最小限の依存関係
- 基本機能に集中（スタイリングはユーザー側）
- CSSファイルを直接パースして@theme変数を抽出

**開発環境**:
- パッケージマネージャー: Bun（高速なインストール・実行、Node.js互換）

## 決定

以下の技術スタックを採用する:

**言語・型システム**:
- TypeScript（型安全性と開発体験）

**コア依存関係（5個）**:
- `commander` - CLI引数パース
- `postcss` - CSS AST解析（@theme抽出）
- `vite` - ビルドツール + preview server
- `picocolors` - ターミナル出力の色付け
- `open` - ブラウザ自動起動

**開発依存関係（4個）**:
- `typescript` - TypeScript本体
- `@types/node` - Node.js型定義
- `svelte` - UIフレームワーク
- `@sveltejs/vite-plugin-svelte` - Vite統合

## 理由

### 1. TypeScript採用
- 型安全性によるバグ削減
- IDE補完とリファクタリング支援
- 型がドキュメント代わり
- Node.js/CLIツールでの主流

### 2. PostCSS（パーサー）
- 業界標準のCSS解析ツール
- エッジケース対応済み
- 信頼性が高い

**却下**: 正規表現パーサー（脆弱でメンテナンスが困難）

### 3. Vite Preview Server（サーバー）
- 既にビルドツールとして使用
- preview機能で本番相当のサーバー提供
- ポート自動検索機能内蔵（`strictPort: false`）
- 静的ファイル配信が最適化済み
- 追加のサーバー依存不要

**却下**: Koa + ミドルウェアスタック（依存増加、設定複雑化）
- 削減できた依存: `koa`, `@koa/router`, `koa-static`, `portfinder`

### 4. picocolors（ターミナル出力）
- 超軽量（chalkの1/14サイズ、~7KB）
- CommonJS/ESM両対応
- ゼロ依存
- chalkと同等のAPI

**却下**: chalk v5（ESM専用でCLIツールに不便、サイズ大）

### 5. Node.js標準API（ファイルシステム）
- `fs/promises`で必要な機能を提供（readFile, access）
- Node.js 14+で安定
- 外部依存不要

**却下**: fs-extra（標準APIで十分、依存削減）

### 6. Svelte（フロントエンド）
- 軽量（ランタイム~2KB）
- シンプルなリアクティビティ（`let`, `$:`）
- TypeScript公式サポート
- Viteとの統合が簡単
- 学習コスト低い（HTMLライクな構文）
- 仮想DOM不使用で高速

**却下**:
- Vue.js（ランタイム~30KB、複雑なAPI）
- React（ランタイム~40KB、学習コスト高）
- Vanilla TypeScript（状態管理が煩雑、リアクティビティの手動実装）

## 影響

**プロジェクト構造**:
```
tailwind-variables-viewer/
├── cli/
│   └── index.ts           # CLIエントリーポイント
├── lib/
│   ├── types.ts           # 型定義
│   ├── parser.ts          # PostCSSパーサー
│   ├── extractor.ts       # 変数整理
│   └── server.ts          # Vite preview server
├── src/
│   ├── App.svelte         # メインアプリ
│   ├── lib/
│   │   ├── SearchBar.svelte
│   │   ├── NamespaceSection.svelte
│   │   └── VariableCard.svelte
│   ├── main.ts
│   └── app.css
└── dist/                  # ビルド済み
```

**ビルド設定**:
- TypeScript: `tsc`でCLIをコンパイル（outDir: dist-cli/）
- Svelte: Viteでフロントエンドをビルド（outDir: dist/）
- bin設定: `./dist-cli/cli/index.js`

**データフロー**:
```
CLI起動
  ↓
PostCSS解析 (parser.ts)
  ↓
変数整理 (extractor.ts)
  ↓
Vite preview server起動 (server.ts)
  ↓
API提供 (/api/variables)
  ↓
Svelte UI (dist/)
```

**依存関係の最適化結果**:
- コア依存: 5個（最小限）
- 開発依存: 4個
- 総依存: 9個

## 実装例

### サーバー起動（lib/server.ts）
```typescript
import { preview } from 'vite';

export async function startServer(organizedVariables, options = {}) {
  const server = await preview({
    preview: {
      port: options.port || 3000,
      strictPort: false, // 自動ポート検索
    },
    configFile: false,
    root: './dist',
  });

  // APIミドルウェア
  server.httpServer?.on('request', (req, res) => {
    if (req.url === '/api/variables') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(organizedVariables));
    }
  });

  return { server, port, url };
}
```

### Svelte UI（src/App.svelte）
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { OrganizedVariables } from '../lib/types';

  let variables: OrganizedVariables | null = null;

  onMount(async () => {
    const response = await fetch('/api/variables');
    variables = await response.json();
  });

  // リアクティブな検索フィルター
  $: filteredVariables = variables && searchQuery
    ? Object.entries(variables).reduce((acc, [ns, vars]) => {
        const filtered = vars.filter(v =>
          v.varName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) acc[ns] = filtered;
        return acc;
      }, {})
    : variables;
</script>
```

## メリット

1. **最小限の依存**: 9個（コア5 + 開発4）
2. **型安全**: TypeScriptで全コード
3. **軽量**: Svelteで最小バンドル
4. **シンプル**: Vite一つでビルド・開発・本番
5. **保守性**: コンポーネント分割、明確な責務
6. **拡張性**: ユーザーがカスタマイズしやすい
