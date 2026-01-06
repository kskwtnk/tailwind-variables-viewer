# 実装フェーズ

プロジェクトを6つのフェーズに分けて段階的に実装します。

## Phase 1: プロジェクトセットアップ

### 目標
空のプロジェクト構造と依存関係の準備

### タスク

1. **package.json作成**
   ```bash
   bun init -y
   ```
   - name: `tailwind-variables-viewer`
   - version: `0.0.0`
   - description: プロジェクト説明
   - bin: CLI設定
   - files: 公開ファイル指定

2. **依存関係インストール**
   ```bash
   bun add commander postcss vite picocolors open
   bun add -d typescript @types/node svelte @sveltejs/vite-plugin-svelte
   ```

3. **TypeScript設定**
   ```bash
   bunx tsc --init
   ```
   - target: ES2020
   - module: ESNext
   - moduleResolution: bundler
   - outDir: dist-cli（CLIビルド用）

4. **ディレクトリ構造作成**
   ```bash
   mkdir -p cli lib src
   ```

5. **.gitignore作成**
   ```
   node_modules/
   dist/
   dist-cli/
   .DS_Store
   *.log
   bun.lock
   ```

6. **README.md作成**
   - プロジェクト概要
   - インストール方法
   - 使用方法
   - 例

### 成果物
- package.json
- tsconfig.json
- ディレクトリ構造
- .gitignore
- README.md

### 確認
```bash
ls -la
bun pm ls
```

---

## Phase 2: テーマ変数抽出とビルドパイプライン

### 目標
ユーザーのTailwind CSSファイルから`@theme`変数を抽出し、Tailwindでビルドして実際の値を表示する

**重要な設計変更**:
- ユーザーは**ビルド前のCSSファイル**を指定（`@import "tailwindcss"` + `@theme`を含む）
- ツール内部でTailwindビルドを実行
- Tailwindのクラス名スキャン機構を活用

### アーキテクチャ

```
ユーザーのCSS（app.css）
  ↓
@theme変数抽出 (theme-parser.ts)
  ↓
HTML生成 (html-generator.ts)
  各変数に対応するクラス名を含む
  例: --color-red-500 → <div class="bg-red-500 text-red-500">
  ↓
Tailwindビルド (builder.ts)
  @tailwindcss/cli で .tmp/preview.html → .tmp/preview.css
  ↓
:root解析
  生成されたCSSから実際の変数値を抽出
  ↓
表示
```

### 想定される入力パターン

ユーザーが指定するCSS:

1. **デフォルトのみ**:
   ```css
   @import "tailwindcss";
   ```

2. **すべてリセット**:
   ```css
   @import "tailwindcss";
   @theme {
     --*: initial;
   }
   ```

3. **デフォルト + カスタム**:
   ```css
   @import "tailwindcss";
   @theme {
     --color-brand-500: oklch(0.65 0.20 200);
     --spacing-custom: 2.5rem;
   }
   ```

4. **カスタムのみ**:
   ```css
   @import "tailwindcss";
   @theme {
     --*: initial;
     --color-primary: oklch(0.5 0.2 240);
   }
   ```

### タスク

1. **lib/types.ts更新**
   - 新しいデータ構造の型定義
   - ThemeVariable（抽出された@theme変数）
   - GeneratedHTML（生成されたHTML情報）

2. **lib/theme-parser.ts実装**
   - PostCSSで`@theme`ブロックを解析
   - CSS変数（`--*`形式）を抽出
   - `--*: initial`は特別扱い（リセットマーカー）
   - ネームスペース検出（--color-*, --spacing-*など）

3. **lib/html-generator.ts実装**
   - 抽出された変数からHTMLを生成
   - 各変数に対応するTailwindクラスを含める
   - 例: `--color-red-500` → `<div class="bg-red-500 text-red-500 border-red-500">`
   - ユーザーのCSS（`@import`付き）を`<style>`タグで埋め込み

4. **lib/builder.ts実装**
   - @tailwindcss/cliを実行
   - .tmp/preview.html → .tmp/preview.css
   - 子プロセスで実行
   - エラーハンドリング

5. **:root解析の再利用**
   - 既存のparser.tsを再利用
   - 生成されたpreview.cssから`:root`を抽出
   - 最終的な変数値を取得

6. **テスト用CSSファイル作成**
   ```bash
   mkdir -p test/scenarios
   ```

   4つのシナリオ:
   - `1-default-only.css`
   - `2-reset-all.css`
   - `3-extend-defaults.css`
   - `4-reset-and-custom.css`

7. **統合テスト**
   ```typescript
   // test-build-pipeline.ts
   import { parseThemeVariables } from './lib/theme-parser.js';
   import { generateHTML } from './lib/html-generator.js';
   import { buildWithTailwind } from './lib/builder.js';
   import { parseCSS } from './lib/parser.js';

   (async () => {
     // 1. @theme変数抽出
     const themeVars = await parseThemeVariables('test/scenarios/1-default-only.css');

     // 2. HTML生成
     const html = generateHTML(themeVars, 'test/scenarios/1-default-only.css');

     // 3. Tailwindビルド
     await buildWithTailwind(html);

     // 4. 最終的なCSS解析
     const parsed = await parseCSS('.tmp/preview.css');
     console.log(parsed);
   })();
   ```

### 成果物
- lib/types.ts（更新）
- lib/theme-parser.ts（新規）
- lib/html-generator.ts（新規）
- lib/builder.ts（新規）
- lib/parser.ts（:root解析、既存を再利用）
- test/scenarios/*.css（テスト用）
- test-build-pipeline.ts

### 確認
```bash
bunx tsx test-build-pipeline.ts
# 4つのシナリオで期待通りの変数が抽出されることを確認
```

### データフロー例

```css
/* 入力: ユーザーのapp.css */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.65 0.20 200);
}
```

↓ theme-parser.ts

```json
[
  {
    "name": "--color-brand-500",
    "value": "oklch(0.65 0.20 200)",
    "namespace": "color"
  }
]
```

↓ html-generator.ts

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @import "tailwindcss";
    @theme {
      --color-brand-500: oklch(0.65 0.20 200);
    }
  </style>
</head>
<body>
  <div class="bg-brand-500 text-brand-500 border-brand-500"></div>
</body>
</html>
```

↓ builder.ts (@tailwindcss/cli)

```css
/* .tmp/preview.css */
:root {
  --color-brand-500: oklch(0.65 0.20 200);
}
/* ... Tailwindが生成したユーティリティクラス */
```

↓ parser.ts

```json
{
  "color": [
    {
      "name": "brand-500",
      "varName": "--color-brand-500",
      "value": "oklch(0.65 0.20 200)",
      "type": "color",
      "namespace": "color"
    }
  ]
}
```

---

## Phase 3: サーバー・CLI実装

### 目標
動作するCLIとAPIサーバー

### タスク

1. **lib/server.ts実装**
   - Vite preview server起動
   - /api/variablesミドルウェア
   - ポート自動検索（Vite機能）
   - エラーハンドリング

2. **cli/index.ts実装**
   - Commander設定
   - オプション定義（型安全）
   - ファイル検証
   - パーサー・サーバー統合
   - picocolorsでログ出力

3. **TypeScriptビルド設定**
   ```json
   // package.json
   {
     "scripts": {
       "build:cli": "tsc",
       "prepare": "bun run build:cli"
     }
   }
   ```

4. **package.json bin設定**
   ```json
   {
     "bin": {
       "tailwind-variables-viewer": "./dist-cli/cli/index.js"
     }
   }
   ```

5. **Shebang付与**
   cli/index.tsの先頭:
   ```typescript
   #!/usr/bin/env node
   ```

### 成果物
- lib/server.ts
- cli/index.ts
- package.json (bin, scripts設定)
- dist-cli/ (ビルド後)

### 確認
```bash
bun run build:cli
node dist-cli/cli/index.js -c test/fixtures/basic.css
# サーバーが起動し、APIが応答することを確認
curl http://localhost:3000/api/variables
```

---

## Phase 4: フロントエンド実装 ✅ **完了**

### 目標
変数を表示する動作するUI

### 方針変更（ADR-002参照）

**当初**: Svelte 5を使用
**変更後**: Vanilla JSを使用（依存関係削減のため）

### タスク

1. **vite.config.ts更新**
   ```typescript
   import { defineConfig } from 'vite';

   export default defineConfig({
     root: 'src',
     build: {
       outDir: '../dist',
       emptyOutDir: true,
     },
     preview: {
       port: 3000,
       strictPort: false,
     },
   });
   ```

2. **src/index.html作成**
   - インラインJavaScript（`<script type="module">`）
   - APIから変数取得
   - 検索フィルタリング
   - クリップボードコピー機能
   - グローバルスタイル読み込み
   - 変数タイプ別プレビュー（色、サイズ、フォント）

3. **src/app.css作成**
   - グローバルスタイル
   - リセットCSS
   - 変数カード、検索バーなどのスタイル
   - レスポンシブレイアウト

4. **package.jsonスクリプト更新**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```

### 実装内容

**src/index.html**:
- `fetch('/api/variables.json')` でデータ取得
- テンプレートリテラルでHTML生成
- `addEventListener` でイベント処理
- 検索: `input`イベントで絞り込み
- コピー: `click`イベントでクリップボードコピー
- タイプ別プレビュー表示

### 成果物
- vite.config.ts（Svelteプラグイン削除）
- src/index.html（Vanilla JS実装）
- src/app.css

### 削除するファイル
- src/App.svelte
- src/lib/*.svelte
- src/main.ts
- src/vite-env.d.ts

### 確認 ✅
```bash
bun run build
# Scenario 1: デフォルトのみ
node dist-cli/cli/index.js -c test/scenarios/1-default-only.css -o
# → 375個のデフォルト変数を表示

# Scenario 2: 全リセット
node dist-cli/cli/index.js -c test/scenarios/2-reset-all.css -o
# → 警告表示（変数なし）

# Scenario 3: デフォルト + カスタム
node dist-cli/cli/index.js -c test/scenarios/3-extend-defaults.css -o
# → 380個の変数を表示（375 default + 5 custom）

# Scenario 4: リセット + カスタムのみ
node dist-cli/cli/index.js -c test/scenarios/4-reset-and-custom.css -o
# → 6個のカスタム変数のみ表示
```

---

## Phase 5: 統合とテスト

### 目標
完全に動作する統合システム

### タスク

1. **Vite-Koa統合**
   - 開発モード: Viteミドルウェア
   - 本番モード: dist/配信

2. **ビルドプロセス設定**
   ```json
   {
     "scripts": {
       "prepare": "bun run build"
     }
   }
   ```

3. **dist/の事前ビルド**
   ```bash
   bun run build
   ```

4. **統合テスト実施**
   - 全テストケースを実行
   - エッジケースの確認
   - エラーハンドリングの確認

5. **実プロジェクトテスト**
   - 実際のTailwind v4プロジェクトで検証
   - パフォーマンス測定
   - 問題の洗い出しと修正

6. **ドキュメント整備**
   - README完成
   - 使用例追加
   - トラブルシューティング追加

### 成果物
- 統合されたシステム
- dist/ビルド済みファイル
- 完成したREADME

### 確認
```bash
node cli/index.js -c /path/to/real/project/app.css -o
# 実際のプロジェクトで動作確認
```

---

## Phase 6: 公開準備

### 目標
npm公開可能なパッケージ

### タスク

1. **package.json最適化**
   ```json
   {
     "name": "tailwind-variables-viewer",
     "version": "1.0.0",
     "description": "View Tailwind CSS v4 theme variables in your browser",
     "keywords": [
       "tailwindcss",
       "tailwind",
       "css",
       "theme",
       "variables",
       "viewer",
       "v4"
     ],
     "repository": {
       "type": "git",
       "url": "https://github.com/your-username/tailwind-variables-viewer"
     },
     "bugs": {
       "url": "https://github.com/your-username/tailwind-variables-viewer/issues"
     },
     "homepage": "https://github.com/your-username/tailwind-variables-viewer#readme",
     "files": [
       "cli",
       "lib",
       "dist"
     ]
   }
   ```

2. **bun linkでローカルテスト**
   ```bash
   bun link
   tailwind-variables-viewer -c test/fixtures/basic.css
   bun unlink
   ```

3. **セキュリティチェック**
   ```bash
   bun pm audit
   ```

4. **パッケージサイズ確認**
   ```bash
   npm pack --dry-run
   ```

5. **LICENSE追加**
   - MIT Licenseなど

6. **最終調整**
   - エラーメッセージの改善
   - ログ出力の整理
   - コメントの追加

7. **バージョン管理**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git tag v1.0.0
   ```

### 成果物
- 完成したnpmパッケージ
- LICENSE
- Git履歴

### 確認
```bash
bun pm pack
# または npm pack（npm互換性）
# 生成された.tgzファイルの内容を確認
tar -tzf tailwind-variables-viewer-1.0.0.tgz
```

---

## 公開（オプション）

準備完了後、npm公開:

```bash
npm login
npm publish
```

公開後の確認:

```bash
npx tailwind-variables-viewer@latest -c test/fixtures/basic.css -o
```

---

## 進捗管理

各フェーズの完了時にチェック:

- [x] Phase 1: プロジェクトセットアップ ✅ **完了**
- [x] Phase 2: CSSパーサー実装 ✅ **完了**
- [x] Phase 3: サーバー・CLI実装 ✅ **完了**
- [x] Phase 4: フロントエンド実装 ✅ **完了**
- [x] Phase 5: 統合とテスト ← **完了**
- [ ] Phase 6: 公開準備 ← **次はここから**
