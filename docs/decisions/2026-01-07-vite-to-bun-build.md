# ADR-004: Vite廃止とBun.build + Node.js標準サーバーへの移行（2026年1月7日）

## 状態

採用

## コンテキスト

パッケージサイズの最適化を進める中で、依存関係の見直しを実施した。

**依存関係の問題点**:
1. Viteが2.2MBと最大の依存関係を占めていた
2. 総依存関係は約2.9MBで、ユーザーインストール時の負担が大きい
3. Viteの主な用途はフロントエンドビルドとpreviewサーバーのみ
4. 開発環境としてBunを使用しているため、Bun.buildが利用可能

**Viteの使用箇所**:
- フロントエンドビルド（src/ui/ → dist/ui/）
- 開発サーバー（HMR機能付き）
- プレビューサーバー（本番環境での静的ファイル配信）

## 決定

**Viteを完全に廃止し、Bun.build + Node.js標準サーバーに移行する。**

**新しい構成**:
```
UIビルド: Bun.build (target: 'browser')
  ↓
dist/ui/assets/app-[hash].js
  ↓
サーバー: Node.js http.createServer()
  ↓
静的ファイル配信 + API提供 (/api/variables.json)
```

## 理由

1. **依存関係削減**: 2.9MB → 0.7MB（約75%削減）
2. **Bun活用**: 既にBunを使用しているため追加コストなし
3. **Node.js互換性**: 標準APIのみ使用でNode.jsユーザーも実行可能
4. **シンプル化**: ビルドツールの統一により設定ファイル削減

## 影響

### 1. 新規ファイル: scripts/build-ui.ts

UIビルドを自動化するスクリプトを作成:

```typescript
import { build } from 'bun';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dir, '..');
const distUiDir = resolve(projectRoot, 'dist/ui');

console.log('Building UI with Bun.build...');

// Bun.buildでTypeScriptをブラウザ向けにコンパイル
const result = await build({
  entrypoints: [resolve(projectRoot, 'src/ui/app.ts')],
  target: 'browser',
  outdir: resolve(projectRoot, 'dist/ui/assets'),
  minify: true,
  sourcemap: 'external',
  naming: '[name]-[hash].[ext]',
});

// ビルドされたJSファイル名を取得
const jsOutput = result.outputs.find(o => o.path.endsWith('.js') && !o.path.endsWith('.map'));
const jsFilename = basename(jsOutput.path);

// HTMLファイルをコピーし、正しいJSパスに更新
let html = readFileSync(resolve(projectRoot, 'src/ui/index.html'), 'utf-8');
html = html.replace('/app.ts', `/assets/${jsFilename}`);
writeFileSync(resolve(distUiDir, 'index.html'), html);

// CSSファイルをコピー
copyFileSync(
  resolve(projectRoot, 'src/ui/app.css'),
  resolve(distUiDir, 'app.css')
);

console.log('✓ UI build complete');
```

**主な機能**:
- TypeScript → JavaScript（target: 'browser'）
- ファイル名にハッシュ付与（キャッシュバスティング）
- HTML内のスクリプトパスを自動更新
- 静的ファイル（CSS）のコピー

### 2. src/core/server.ts の完全書き換え

Viteプレビューサーバーから、Node.js標準`http.createServer()`に移行:

**変更前** (Vite使用):
```typescript
import { preview } from 'vite';

export async function startServer(
  organizedVariables: OrganizedVariables,
  options: ServerOptions = {}
): Promise<ServerResult> {
  const server = await preview({
    preview: { port },
    // ...Vite設定
  });

  return { server: server.httpServer, port, url };
}
```

**変更後** (Node.js標準):
```typescript
import { createServer } from 'http';
import { readFile } from 'fs/promises';

export async function startServer(
  organizedVariables: OrganizedVariables,
  options: ServerOptions = {}
): Promise<ServerResult> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    // API endpoint
    if (url.pathname === '/api/variables.json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(organizedVariables, null, 2));
      return;
    }

    // Static file serving
    try {
      const filePath = url.pathname === '/'
        ? resolve(distUiDir, 'index.html')
        : resolve(distUiDir, url.pathname.slice(1));

      const content = await readFile(filePath);
      const contentType = getContentType(extname(filePath));

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  // ポート自動検索
  let actualPort = port;
  let retries = 10;

  const tryListen = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          retries--;
          actualPort++;
          server.close();
          setTimeout(() => tryListen().then(resolve).catch(reject), 100);
        } else {
          reject(err);
        }
      });
      server.listen(actualPort, () => resolve(actualPort));
    });
  };

  actualPort = await tryListen();

  return { server, port: actualPort, url: `http://localhost:${actualPort}` };
}
```

**主な機能**:
- APIエンドポイント（/api/variables.json）
- 静的ファイル配信（HTML、CSS、JS）
- MIME typeの自動判定
- ポート使用中の場合の自動検索
- Node.js標準APIのみ使用

### 3. src/cli/index.ts の修正

**SIGINTハンドラの修正**:

**変更前** (Vite API):
```typescript
process.on('SIGINT', () => {
  console.log(pc.yellow('\n\nShutting down...'));
  server.httpServer?.close(() => {
    console.log(pc.green('Server closed'));
    process.exit(0);
  });
});
```

**変更後** (Node.js標準):
```typescript
process.on('SIGINT', () => {
  console.log(pc.yellow('\n\nShutting down...'));
  server.close(() => {
    console.log(pc.green('✓ Server closed'));
    process.exit(0);
  });
});
```

**理由**:
- Viteの`httpServer`プロパティではなく、直接`server.close()`を使用
- Node.js標準APIに統一

### 4. src/core/types.ts の更新

```typescript
export interface ServerResult {
  server: any; // Node.js http.Server (変更前: Vite preview server)
  port: number;
  url: string;
}
```

### 5. package.json の更新

**削除**:
```json
"dependencies": {
  "vite": "^6.0.7" // 削除
}
```

**スクリプト変更**:
```json
"scripts": {
  "build": "bun scripts/build-ui.ts",
  "dev": "bun scripts/build-ui.ts && bun run build:cli && node dist/cli/index.js -c dev/sample.css -o",
  "prepublishOnly": "bun run build && bun run build:cli"
}
```

### 6. vite.config.ts の削除

設定ファイル不要になったため削除。

## パフォーマンス比較

**依存関係サイズ**:
- 変更前: 2.9MB (Vite 2.2MB含む)
- 変更後: 0.7MB
- **削減率: 約75%**

**パッケージ圧縮サイズ**:
- 変更前: 24KB
- 変更後: 28KB
- 増加: 4KB（ビルドスクリプト分）

**起動時間**:
- ほぼ変化なし（約0.5秒）

## メリット

1. **大幅な依存関係削減**: 2.2MB削減でユーザーインストールが高速化
2. **ツールの統一**: Bunに統一され、設定ファイルがシンプルに
3. **Node.js互換性**: 標準APIのみ使用で幅広い環境で実行可能
4. **メンテナンス性向上**: 依存関係が減り、セキュリティリスクも低減
5. **完全制御**: サーバーロジックを完全に把握・カスタマイズ可能

## デメリット

1. **HMR喪失**: 開発時のホットリロードがなくなる
   - 影響は限定的（フロントエンドは小規模、手動リロードで十分）
2. **ビルドスクリプト保守**: scripts/build-ui.tsの保守が必要
   - シンプルなスクリプトのため、保守コストは低い
3. **パッケージサイズ微増**: 4KB増加（ビルドスクリプト追加分）
   - 依存関係削減効果（2.2MB）と比較すると無視できる

## 将来の検討

### Bun.serveの検討

現在はNode.js互換性のため`http.createServer()`を使用しているが、将来的にBun専用の最適化が必要になった場合は`Bun.serve()`への移行を検討可能:

```typescript
// 将来の選択肢
const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/variables.json') {
      return new Response(JSON.stringify(organizedVariables), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(Bun.file(resolve(distUiDir, url.pathname)));
  }
});
```

ただし、現時点ではNode.js互換性を優先。

## 結論

Vite廃止により、依存関係を75%削減しつつ、Node.js互換性を維持したまま、同等の機能を提供できるようになった。

開発体験の一部（HMR）は失われるが、このプロジェクトの規模では実用上の問題はなく、ユーザーにとってはインストール時間短縮という明確なメリットがある。
