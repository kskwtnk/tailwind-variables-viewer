---
paths:
  - "lib/server.ts"
---

# 開発サーバー実装ガイド

## 責務

Vite preview serverでフロントエンドと変数データAPIを提供する。

## エンドポイント

### GET /
- フロントエンド配信（dist/）
- Vite preview serverが処理

### GET /api/variables
- 整理済み変数データ（JSON）
- カスタムミドルウェアで提供

## アーキテクチャ

Vite preview serverにミドルウェアを注入してAPIを提供:

```typescript
import { preview } from 'vite';
import type { OrganizedVariables, ServerOptions, ServerResult } from './types';

export async function startServer(
  organizedVariables: OrganizedVariables,
  options: ServerOptions = {}
): Promise<ServerResult> {
  const port = options.port || 3000;

  // Vite preview serverを起動
  const server = await preview({
    preview: {
      port,
      strictPort: false, // ポートが使用中なら自動で次を探す
      open: false,       // ブラウザは手動で開く
    },
    configFile: false,   // vite.config.jsを使わない
    root: './dist',      // ビルド済みファイル
  });

  // カスタムミドルウェアでAPIを追加
  server.httpServer?.on('request', (req, res) => {
    if (req.url === '/api/variables') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(organizedVariables));
    }
  });

  const actualPort = server.resolvedUrls?.local[0]
    ? new URL(server.resolvedUrls.local[0]).port
    : port;

  return {
    server,
    port: Number(actualPort),
    url: `http://localhost:${actualPort}`,
  };
}
```

## Vite設定との連携

vite.config.tsでビルド設定を定義:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
```

## ポート管理

Viteの`strictPort: false`で自動的に利用可能なポートを検索:

```typescript
// ポート3000が使用中なら、3001, 3002...と自動で試行
preview: {
  port: 3000,
  strictPort: false, // これでportfinder不要
}
```

## 開発モード

開発時は通常のVite dev serverを使用:

```bash
# 開発時（HMR有効）
bun run dev

# CLIツール実行時（preview server）
node cli/index.js -c ./test.css
```

CLIツールは常にpreview serverを使用（ビルド済みdist/を配信）

## エラーハンドリング

### ポート使用中

Viteの`strictPort: false`で自動解決されるため、エラーハンドリング不要。

### API エラー

```typescript
server.httpServer?.on('request', (req, res) => {
  if (req.url === '/api/variables') {
    try {
      if (!organizedVariables || Object.keys(organizedVariables).length === 0) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'No variables found' }));
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(organizedVariables));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});
```

## CORS設定

Vite preview serverはデフォルトでCORSを適切に処理。追加設定不要。

## ログ出力

起動時の情報表示（picocolorsを使用）:

```typescript
import pc from 'picocolors';

console.log(pc.green('\n✓ Server started'));
console.log(pc.cyan(`→ ${url}`));
console.log(pc.gray(`\nVariables: ${totalVariables}`));
console.log(pc.gray('Press Ctrl+C to stop\n'));
```

## テストケース

- [ ] デフォルトポート3000で起動
- [ ] カスタムポートで起動
- [ ] ポート使用中の自動検索
- [ ] /api/variablesが正しいJSONを返す
- [ ] 静的ファイル配信（本番）
- [ ] 存在しないエンドポイントで404
- [ ] サーバーのgraceful shutdown

## パフォーマンス

- 変数データはメモリにキャッシュ（再パース不要）
- Viteの最適化された静的ファイル配信
- 追加ミドルウェアなしで軽量
