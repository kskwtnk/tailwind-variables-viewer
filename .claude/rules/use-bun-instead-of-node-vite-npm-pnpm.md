---
paths: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
---

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

### Viteは使用する

フロントエンド（Svelte）のビルドとpreview serverには**Viteを使用**します。
これはプロジェクトの設計方針であり、`Bun.serve()`は使用しません。

- `bun run dev`: Vite開発サーバー
- `bun run build`: Viteでフロントエンドビルド
- `bun run preview`: Vite preview server

### TypeScriptコンパイル

CLIコードのコンパイルには`tsc`を使用します（Bunの制約回避のため）。

```bash
bun run build:cli  # tscでCLIをコンパイル
```
