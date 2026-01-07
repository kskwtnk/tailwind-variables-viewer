# ADR-006: Vite開発サーバーによるホットリロード実装（2026年1月8日）

## 状態

採用

## コンテキスト

### 以前の試み（2026年1月7日）

1月7日に、依存関係削減を目的として**Viteを完全廃止**し、Bun.build + Node.js標準サーバーに移行した（ADR-004）。
- 依存関係: 2.9MB → 0.7MB（約75%削減）
- デメリット: HMR（ホットリロード）の喪失

### 問題の発覚

ホットリロードがないことで、開発体験が著しく低下することが判明:
1. **UIファイル変更時**: 手動でブラウザリロードが必要
2. **ユーザーのCSSファイル変更時**: サーバー再起動が必要
3. 開発時の反復サイクルが遅く、ストレスが大きい

### SSEによる実装試行

Server-Sent Events（SSE）とchokidarを使った独自のホットリロード実装を試みた:

```typescript
// SSE endpoint
const sseClients = new Set<ServerResponse>();

if (url.pathname === "/api/sse") {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Connection": "keep-alive",
  });
  res.write("data: connected\n\n");
  sseClients.add(res);
}

// File watcher
const watcher = chokidar.watch(cssFilePath);
watcher.on("change", () => {
  for (const client of sseClients) {
    client.write("data: reload\n\n");
  }
});
```

**結果**: **完全に失敗**
- SSE接続が即座に切断される（`ECONNRESET`エラー）
- `res.flushHeaders()`などの試行も無効
- Node.jsのHTTPサーバーとSSEの相性問題が解決できず

## 決定

**Viteの開発サーバー（`vite.createServer`）を再導入する。**

これにより:
1. ViteのHMR機能を活用
2. ユーザーのCSSファイル変更も監視してブラウザをリロード
3. 安定したWebSocket接続による確実なホットリロード

## 実装

### 1. Viteを依存関係に復帰

```json
{
  "dependencies": {
    "chokidar": "^5.0.0",
    "commander": "^14.0.2",
    "picocolors": "^1.1.1",
    "postcss": "^8.5.6",
    "vite": "^7.3.1"
  }
}
```

### 2. Vite開発サーバーの起動

```typescript
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  root: distUiDir, // パッケージの dist/ui を参照
  server: {
    open: options.open,
    port: options.port,
    strictPort: false,
  },
});

await server.listen();
```

### 3. カスタムプラグインでCSSファイル監視

```typescript
plugins: [
  {
    name: "watch-css",
    async configureServer(server) {
      const chokidar = await import("chokidar");
      const cssFilePath = resolve(options.config[0]);
      const watcher = chokidar.watch(cssFilePath, {
        awaitWriteFinish: { pollInterval: 50, stabilityThreshold: 100 },
        ignoreInitial: true,
      });

      watcher.on("change", async () => {
        console.log(pc.cyan("\n🔄 CSS file changed, reloading..."));

        // Re-parse CSS and update variables.json
        const result = await parseAndOrganize(options.config);
        await writeFile(
          resolve(apiDir, "variables.json"),
          JSON.stringify(result.organized, null, 2),
          "utf8",
        );

        // Trigger browser reload via WebSocket
        server.ws.send({
          path: "*",
          type: "full-reload",
        });

        console.log(pc.green("✓ Reloaded successfully"));
      });
    },
  },
],
```

**ポイント**:
- ViteプラグインAPI（`configureServer`）を使用
- chokidarでユーザーのCSSファイルを監視
- 変更時に`variables.json`を更新してからWebSocketで`full-reload`を送信
- ViteのWebSocketインフラを利用するため、接続が安定

### 4. パス解決の修正

CLIを他のプロジェクトから実行する場合に対応:

```typescript
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// dist/cli/index.js から dist/ui へのパス
const distUiDir = resolve(__dirname, "..", "ui");
```

**理由**:
- `process.cwd()`は実行ディレクトリ基準（ユーザーのプロジェクト）
- `__dirname`はスクリプト自身の場所基準（パッケージ内）
- 他のプロジェクトから`node ../tailwind-variables-viewer/dist/cli/index.js`で実行可能

### 5. 開発モードと本番モードの分離

**開発モード（`bun run dev`）**:
- `scripts/dev.ts`が`src/ui`を直接Viteで配信
- `vite.config.ts`で`root: "src/ui"`を設定
- ViteのHMRが`app.css`と`app.ts`を自動的に監視
- 変数データ（`src/ui/api/variables.json`）は起動時に生成

```typescript
// scripts/dev.ts
const server = await createServer({
  plugins: [
    {
      name: "watch-sample-css",
      async configureServer(server) {
        // dev/sample.css を監視して変数を再生成
      },
    },
  ],
  server: { open: true },
});
```

**本番モード（CLIツール実行）**:
- `dist/ui`（ビルド済み静的ファイル）を配信
- Bun.buildでJSとCSSをバンドル
- ユーザーのCSSファイルを監視してブラウザリロード

```json
{
  "scripts": {
    "dev": "bun scripts/dev.ts",
    "build": "bun scripts/build.ts && tsc"
  }
}
```

**分離のメリット**:
- 開発時: `src/ui`を直接配信してHMRフル活用
- 本番時: `dist/ui`を配信してパフォーマンス最適化
- CSSインポート（`import "./app.css"`）がViteで自動処理

## メリット

1. **確実なホットリロード**
   - ViteのWebSocketインフラで安定した接続
   - UIファイル変更: Vite HMR（即座）
   - CSSファイル変更: カスタムプラグイン（full-reload）
2. **開発体験の向上**
   - ファイル保存後、即座にブラウザが更新
   - 手動リロード・サーバー再起動不要
   - ストレスフリーな開発サイクル
3. **実装の簡素化**
   - SSEの自作実装不要
   - Viteの成熟したインフラを活用
   - メンテナンスコスト削減
4. **他プロジェクトでの動作**
   - `__dirname`ベースのパス解決で、どこから実行しても動作
   - `npx tailwind-variables-viewer -c ./src/app.css -o`が正常動作

## デメリット

1. **依存関係の増加**
   - 0.7MB → 3.4MB（Vite 2.7MB追加）
   - npm install時間の増加
2. **パッケージサイズの増加**
   - しかし、ユーザーにとってはホットリロードの価値 > インストール時間

## 代替案とその却下理由

### 代替案1: SSE + chokidar（独自実装）

**却下理由**: 実装できなかった
- SSE接続が即座に切断される問題を解決できず
- Node.js標準サーバーとSSEの相性が悪い
- 複数のブラウザタブで接続カウントがおかしくなる

### 代替案2: WebSocket（独自実装）

**却下理由**: 実装コストが高い
- WebSocketライブラリ（`ws`など）の追加が必要
- Viteと同等の機能を自作することになる
- Viteを使った方が確実

### 代替案3: ホットリロードなし

**却下理由**: 開発体験が悪すぎる
- 毎回の手動リロード・サーバー再起動が必要
- 開発速度が低下
- ユーザーにとっても不便

## 追加の最適化（2026年1月8日更新）

### CSS import問題の解決

当初、HTMLで`<link rel="stylesheet" href="/app.css">`として読み込んでいたが、ViteのHMRが動作しなかった。

**原因**: HTMLの`<link>`タグで読み込んだCSSは、Viteのモジュールグラフに含まれないため、HMRの対象外。

**解決策**: JavaScriptから`import "./app.css"`として読み込む。

```typescript
// src/ui/app.ts
import "./app.css";
import type { OrganizedVariable, OrganizedVariables } from "../core/types.js";

// ... rest of code
```

これにより、Viteが`app.css`を依存関係として認識し、変更時に自動的にHMRが動作する。

### .gitignoreの追加

開発時に生成される`src/ui/api/variables.json`をgit管理から除外:

```gitignore
# generated during dev
src/ui/api/
```

### ビルドスクリプトの統合

`build:cli`と`build`を統合して、`bun run build`だけで全てビルド:

```json
{
  "scripts": {
    "build": "bun scripts/build.ts && tsc",
    "prepublishOnly": "bun run build"
  }
}
```

**理由**:
- `build`コマンド単独では不完全だった
- `prepublishOnly`で両方実行していたため、`build`に統合
- より直感的で分かりやすい

## 結論

依存関係は増加するが、**ホットリロードは必須機能**と判断。

Viteの開発サーバーを使うことで:
- 安定したホットリロード
- シンプルな実装
- 優れた開発体験

を実現できる。SSEの自作実装は技術的に困難であり、Viteという成熟したツールを活用する方が合理的。

開発モードと本番モードを分離することで、開発時はViteのHMRをフル活用し、本番時はビルド済み静的ファイルを配信するという、両方の利点を最大化できた。

## 教訓

1. **車輪の再発明は避けるべき**
   - SSE/WebSocketの自作実装より、Viteの利用が賢明
   - 成熟したツールのインフラを活用すべき
2. **開発体験は重要**
   - 依存関係削減 < 開発体験向上
   - ホットリロードは現代的な開発に不可欠
3. **段階的な最適化**
   - 最初からViteを削除せず、段階的に検討すべきだった
   - パフォーマンス最適化と機能性のバランスが重要
