# アーキテクチャ意思決定記録（ADR）

このドキュメントは、プロジェクトの重要な技術的意思決定を記録します。

## ADR-001: 技術スタック選定（2024年12月）

### 状態
採用

### コンテキスト
Tailwind CSS v4の`@theme`ディレクティブで定義されたテーマ変数を可視化するCLIツールを開発する。参考: [tailwind-config-viewer](https://github.com/rogden/tailwind-config-viewer/)（v3のみ対応）

**要件**:
- CLIツール形式（`npx tailwind-variables-viewer`で実行可能）
- 最小限の依存関係
- 基本機能に集中（スタイリングはユーザー側）
- CSSファイルを直接パースして@theme変数を抽出

**開発環境**:
- パッケージマネージャー: Bun（高速なインストール・実行、Node.js互換）

### 決定

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

### 理由

#### 1. TypeScript採用
- 型安全性によるバグ削減
- IDE補完とリファクタリング支援
- 型がドキュメント代わり
- Node.js/CLIツールでの主流

#### 2. PostCSS（パーサー）
- 業界標準のCSS解析ツール
- エッジケース対応済み
- 信頼性が高い

**却下**: 正規表現パーサー（脆弱でメンテナンスが困難）

#### 3. Vite Preview Server（サーバー）
- 既にビルドツールとして使用
- preview機能で本番相当のサーバー提供
- ポート自動検索機能内蔵（`strictPort: false`）
- 静的ファイル配信が最適化済み
- 追加のサーバー依存不要

**却下**: Koa + ミドルウェアスタック（依存増加、設定複雑化）
- 削減できた依存: `koa`, `@koa/router`, `koa-static`, `portfinder`

#### 4. picocolors（ターミナル出力）
- 超軽量（chalkの1/14サイズ、~7KB）
- CommonJS/ESM両対応
- ゼロ依存
- chalkと同等のAPI

**却下**: chalk v5（ESM専用でCLIツールに不便、サイズ大）

#### 5. Node.js標準API（ファイルシステム）
- `fs/promises`で必要な機能を提供（readFile, access）
- Node.js 14+で安定
- 外部依存不要

**却下**: fs-extra（標準APIで十分、依存削減）

#### 6. Svelte（フロントエンド）
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

### 影響

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

### 実装例

#### サーバー起動（lib/server.ts）
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

#### Svelte UI（src/App.svelte）
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

### メリット

1. **最小限の依存**: 9個（コア5 + 開発4）
2. **型安全**: TypeScriptで全コード
3. **軽量**: Svelteで最小バンドル
4. **シンプル**: Vite一つでビルド・開発・本番
5. **保守性**: コンポーネント分割、明確な責務
6. **拡張性**: ユーザーがカスタマイズしやすい

---

## ADR-002: フロントエンド実装の変更（2026年1月）

### 状態
採用

### コンテキスト
Phase 4でSvelte 5を使ってフロントエンドを実装したが、以下の点が判明した：

**実装した機能**:
- 検索フィルタリング（テキスト入力による絞り込み）
- 変数カード表示
- クリップボードコピー機能

**問題点**:
1. Svelte 5のルーン（`$state`, `$derived`, `$props`等）の学習コストが高い
2. `mount`関数への移行など、破壊的変更への対応が必要
3. 実装した機能がシンプルで、Vanilla JSでも十分実装可能
4. 依存関係を最小化するという当初の方針と矛盾

**要件の再確認**:
- 検索フィルタリング（1つのテキスト入力）
- 将来的な拡張予定は不明確
- 「最小限の依存関係」が重要な設計方針

### 決定

Svelteを**廃止**し、Vanilla JSに戻す。

**理由**:
1. **実装の複雑性**: 現在の機能はVanilla JSで十分実装可能
2. **依存関係削減**: `svelte`と`@sveltejs/vite-plugin-svelte`を削除（開発依存2個減）
3. **保守性**: Svelteのバージョンアップ（破壊的変更）への追従が不要
4. **バンドルサイズ**: Vanilla JSの方がさらに軽量（~1-2KB vs ~12KB）
5. **学習コスト**: プロジェクトに参加する開発者の障壁が低い

**Svelteを維持する場合のメリット**:
- 複雑な状態管理が必要になった場合の拡張性
- コンポーネント化による保守性

**判断**:
現時点では「将来の拡張性」よりも「最小限の依存関係」を優先する。
将来的に複雑な機能が必要になった場合は、その時点で再検討する（YAGNI原則）。

### 影響

**依存関係の変更**:
- 削除: `svelte`, `@sveltejs/vite-plugin-svelte`
- コア依存: 5個（変更なし）
- 開発依存: 4個 → 2個
- 総依存: 9個 → 7個

**ファイル構成の変更**:
```diff
  src/
- ├── App.svelte
- ├── lib/
- │   ├── SearchBar.svelte
- │   ├── NamespaceSection.svelte
- │   └── VariableCard.svelte
- ├── main.ts
+ ├── index.html (インラインJavaScript)
  ├── app.css
- └── vite-env.d.ts
```

**Vanilla JS実装方針**:
- `index.html`に直接JavaScriptを記述
- `<script type="module">`でESモジュール構文を使用
- テンプレートリテラルでHTML生成
- `addEventListener`でイベント処理

### 実装例

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind Variables Viewer</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div id="app">
    <h1>Tailwind CSS v4 Theme Variables</h1>
    <input type="search" id="search" placeholder="Search variables...">
    <div id="variables"></div>
  </div>

  <script type="module">
    // Fetch and render variables
    fetch('/api/variables.json')
      .then(res => res.json())
      .then(variables => {
        renderVariables(variables);
        setupSearch(variables);
      });

    function renderVariables(variables) {
      const container = document.getElementById('variables');
      const html = Object.entries(variables).map(([namespace, vars]) => `
        <section class="namespace-section">
          <h2>${namespace} <span class="count">(${vars.length})</span></h2>
          <div class="variables-grid">
            ${vars.map(v => `
              <div class="variable-card" data-var-name="${v.varName}">
                ${renderPreview(v)}
                <code class="variable-name">${v.varName}</code>
                <span class="variable-value">${v.value}</span>
                <button class="copy-btn" data-text="${v.varName}">Copy</button>
              </div>
            `).join('')}
          </div>
        </section>
      `).join('');
      container.innerHTML = html;
      setupCopyButtons();
    }

    function setupSearch(variables) {
      const search = document.getElementById('search');
      const cards = document.querySelectorAll('.variable-card');
      search.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        cards.forEach(card => {
          const name = card.dataset.varName.toLowerCase();
          card.style.display = name.includes(query) ? '' : 'none';
        });
      });
    }

    function setupCopyButtons() {
      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(btn.dataset.text);
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        });
      });
    }

    function renderPreview(variable) {
      if (variable.type === 'color') {
        return `<div class="color-swatch" style="background: ${variable.value}"></div>`;
      }
      if (variable.type === 'size') {
        return `<div class="size-bar" style="width: ${variable.value}"></div>`;
      }
      if (variable.type === 'font') {
        return `<div class="font-sample" style="font-family: ${variable.value}">The quick brown fox</div>`;
      }
      return '';
    }
  </script>
</body>
</html>
```

### メリット

1. **依存関係削減**: 総依存7個（Svelteから2個削減）
2. **保守性向上**: フレームワークのバージョンアップ対応不要
3. **シンプル**: 1ファイルで完結
4. **軽量**: バンドルサイズ最小化
5. **学習コスト**: 標準Web APIのみ

### 将来の再検討ポイント

以下の機能が必要になった場合、Svelteまたは他のフレームワークを再検討：
- 複数の検索フィルター（AND/OR条件）
- ソート機能の複数パターン
- 変数の編集機能
- 設定画面（ユーザー設定の保存）
- ページネーション
- 複雑な状態管理が必要な機能

---

## ドキュメント管理

### このドキュメントの目的
- 技術選定の理由を明確に記録
- 将来の意思決定の参考資料
- 新規参加者への背景説明

### 更新ルール
- 重要な技術選定時に追記
- ADR番号は連番
- 状態: 提案 → 採用/却下/廃止
