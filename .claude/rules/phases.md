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

## Phase 2: CSSパーサー実装

### 目標
@themeディレクティブから変数を抽出する動作するパーサー

### タスク

1. **lib/types.ts実装**
   - 全型定義を集約

2. **lib/parser.ts実装**
   - PostCSSでCSS解析
   - @themeルール検出
   - CSS変数抽出
   - エラーハンドリング
   - 型安全な実装

3. **lib/extractor.ts実装**
   - ネームスペース検出
   - 変数タイプ判定
   - 短縮名抽出
   - ソート処理
   - 型安全な実装

4. **テスト用CSSファイル作成**
   ```bash
   mkdir -p test/fixtures
   ```
   - basic.css
   - multiple-blocks.css
   - complex.css

5. **手動テスト**
   ```typescript
   // test-parser.ts
   import { parseCSSFiles } from './lib/parser';
   import { organizeVariables } from './lib/extractor';

   (async () => {
     const parsed = await parseCSSFiles(['test/fixtures/basic.css']);
     const organized = organizeVariables(parsed);
     console.log(JSON.stringify(organized, null, 2));
   })();
   ```

### 成果物
- lib/types.ts
- lib/parser.ts
- lib/extractor.ts
- test/fixtures/*.css
- test-parser.ts

### 確認
```bash
bunx tsx test-parser.ts
# 変数が正しく抽出・整理されることを確認
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

## Phase 4: フロントエンド実装

### 目標
変数を表示する動作するUI

### タスク

1. **vite.config.ts作成**
   ```typescript
   import { defineConfig } from 'vite';
   import { svelte } from '@sveltejs/vite-plugin-svelte';

   export default defineConfig({
     plugins: [svelte()],
     root: 'src',
     build: {
       outDir: '../dist',
       emptyOutDir: true,
     },
   });
   ```

2. **src/vite-env.d.ts作成**
   ```typescript
   /// <reference types="svelte" />
   /// <reference types="vite/client" />
   ```

3. **src/main.ts作成**
   ```typescript
   import App from './App.svelte';
   import './app.css';

   const app = new App({
     target: document.getElementById('app')!,
   });

   export default app;
   ```

4. **src/App.svelte作成**
   - APIからデータ取得（onMount）
   - 状態管理（loading, error, variables）
   - 検索フィルタリング（リアクティブ）
   - レイアウト

5. **src/lib/コンポーネント作成**
   - SearchBar.svelte（検索バー）
   - NamespaceSection.svelte（ネームスペースセクション）
   - VariableCard.svelte（変数カード）

6. **src/app.css作成**
   - グローバルスタイル
   - リセットCSS

7. **package.jsonスクリプト追加**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "check": "svelte-check"
     }
   }
   ```

### 成果物
- vite.config.ts
- src/App.svelte
- src/lib/*.svelte
- src/main.ts
- src/app.css
- src/vite-env.d.ts

### 確認
```bash
bun run dev
# ブラウザで http://localhost:5173 を開く
# 変数が表示されることを確認
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
- [ ] Phase 2: CSSパーサー実装 ← **次はここから**
- [ ] Phase 3: サーバー・CLI実装
- [ ] Phase 4: フロントエンド実装
- [ ] Phase 5: 統合とテスト
- [ ] Phase 6: 公開準備
