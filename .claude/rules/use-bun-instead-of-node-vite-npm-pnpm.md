# Bunの使用を優先

このプロジェクトでは、開発環境としてBunを使用します。

## 基本コマンド

- `node <file>`や`ts-node <file>`の代わりに`bun <file>`を使用
- `npm install`の代わりに`bun install`を使用
- `npm run <script>`の代わりに`bun run <script>`を使用
- Bunは自動的に`.env`を読み込むため、dotenvは不要

## ファイルシステムAPI

**このプロジェクトではNode.js互換性を保つため、`node:fs`を使用します。**

```ts
// このプロジェクトでの推奨（Node.js互換）
import { readFile } from 'node:fs/promises';
const contents = await readFile("path/to/file.txt", "utf-8");

// ❌ 使用しない（Bun専用API、Node.jsで動作しない）
const file = Bun.file("path/to/file.txt");
const contents = await file.text();
```

理由：
- npm公開してNode.jsユーザーも使えるようにするため
- 公開パッケージに`Bun.file`を含めるとNode.jsで実行できない

## このプロジェクトでの注意点

### フロントエンドビルド

フロントエンドのビルドには**Bun.build**を使用します（`scripts/lib/ui-builder.ts`）。

- `bun run dev`: 開発モード（Vite dev server + HMR）
- `bun run build`: プロダクションビルド（Bun.buildでUIバンドル + tscでCLIコンパイル）

技術選定の経緯は[@docs/decisions/2026-01-08-vite-for-hmr.md](../../docs/decisions/2026-01-08-vite-for-hmr.md)を参照。

### サーバー

本番環境（CLIツール実行時）では**Vite dev server**を使用します（[@src/cli/index.ts](../../src/cli/index.ts)）。

```typescript
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  root: distUiDir,
  plugins: [tailwindcss(), watchCssPlugin],
  server: { open: options.open, port: options.port },
});
```

**Viteを使用する理由**:
- HMR（ホットモジュールリロード）による優れた開発体験
- chokidarによるCSSファイル監視と自動リロード
- WebSocketベースの安定したブラウザ通信
- Node.js互換（npmパッケージとして公開可能）

**`Bun.serve()`は使用しません**:
- Node.jsユーザーとの互換性を保つため
- npmパッケージとして公開するため

### TypeScriptコンパイル

CLIとコアコードのコンパイルには**tsc**を使用します（Node.js互換性のため）。

```bash
bun run build  # Bun.build（UI） + tsc（CLI/core）
```

ビルドプロセス:
1. `bun scripts/build.ts` - UIをBun.buildでバンドル
2. `tsc` - CLIとコアをCommonJS/ESMに変換
