---
paths:
  - "cli/index.ts"
---

# CLI実装ガイド

## 責務

Commanderを使用したCLIインターフェースの提供とオーケストレーション。

## コマンド仕様

### 基本形式

```bash
npx tailwind-variables-viewer -c <css-file> [options]
```

### オプション

| オプション | 短縮 | 説明 | デフォルト |
|-----------|------|------|------------|
| `--config <path...>` | `-c` | CSSファイルパス（複数可） | 必須 |
| `--port <number>` | `-p` | ポート番号 | 3000 |
| `--open` | `-o` | ブラウザ自動起動 | false |
| `--help` | `-h` | ヘルプ表示 | - |
| `--version` | `-v` | バージョン表示 | - |

## 実装パターン

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import open from 'open';
import { resolve } from 'path';
import { access } from 'fs/promises';
import { parseCSSFiles } from '../lib/parser.js';
import { organizeVariables } from '../lib/extractor.js';
import { startServer } from '../lib/server.js';

const program = new Command();

program
  .name('tailwind-variables-viewer')
  .description('View Tailwind CSS v4 theme variables in your browser')
  .version('1.0.0')
  .requiredOption('-c, --config <path...>', 'CSS file(s) with @theme directives')
  .option('-p, --port <number>', 'Port number', parseInt, 3000)
  .option('-o, --open', 'Open browser automatically', false)
  .action(async (options) => {
    try {
      await runViewer(options);
    } catch (error) {
      console.error(pc.red('Error:'), error.message);
      process.exit(1);
    }
  });

async function runViewer(options) {
  // 1. ファイル存在確認
  console.log(pc.cyan('Checking CSS files...'));
  await validateFiles(options.config);

  // 2. CSS解析
  console.log(pc.cyan('Parsing CSS files...'));
  const parsed = await parseCSSFiles(options.config);

  // 3. 変数整理
  const organized = organizeVariables(parsed);
  const totalVariables = Object.values(organized)
    .reduce((sum, vars) => sum + vars.length, 0);

  if (totalVariables === 0) {
    console.warn(pc.yellow('Warning: No theme variables found'));
    console.log(pc.gray('Make sure your CSS contains @theme directives'));
    process.exit(0);
  }

  console.log(pc.green(`✓ Found ${totalVariables} theme variables`));

  // カテゴリ別表示
  for (const [namespace, vars] of Object.entries(organized)) {
    console.log(pc.gray(`  - ${namespace} (${vars.length})`));
  }

  // 4. サーバー起動（Viteが自動でポート検索）
  console.log(pc.cyan('\nStarting server...'));
  const { server, port, url } = await startServer(organized, { port: options.port });

  console.log(pc.green('\n✓ Server started'));
  console.log(pc.cyan(`→ ${url}`));
  console.log(pc.gray('Press Ctrl+C to stop\n'));

  // 6. ブラウザ起動
  if (options.open) {
    await open(`http://localhost:${port}`);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(pc.yellow('\nShutting down...'));
    server.httpServer?.close(() => {
      console.log(pc.green('Server closed'));
      process.exit(0);
    });
  });
}

async function validateFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    const absolutePath = resolve(filePath);
    try {
      await access(absolutePath);
    } catch {
      console.error(pc.red(`Error: CSS file not found: ${filePath}`));
      console.log(pc.yellow('\nTip: Specify your theme CSS with -c'));
      console.log(pc.gray('Example: tailwind-variables-viewer -c ./src/app.css'));
      process.exit(1);
    }
  }
}

program.parse();
```

## エラーハンドリング

### ファイルが見つからない

```typescript
try {
  await access(filePath);
} catch {
  console.error(pc.red(`Error: CSS file not found: ${filePath}`));
  console.log(pc.yellow('\nUsage examples:'));
  console.log(pc.gray('  tailwind-variables-viewer -c ./src/app.css'));
  console.log(pc.gray('  tailwind-variables-viewer -c ./theme.css -c ./colors.css'));
  process.exit(1);
}
```

### @themeが見つからない

```typescript
if (totalVariables === 0) {
  console.warn(pc.yellow('Warning: No theme variables found'));
  console.log(pc.gray('\nMake sure your CSS contains @theme directives:'));
  console.log(pc.gray('@theme {'));
  console.log(pc.gray('  --color-primary: oklch(0.5 0.2 240);'));
  console.log(pc.gray('}'));
  process.exit(0);
}
```

### 不正なポート番号

```typescript
.option('-p, --port <number>', 'Port number', (value) => {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(pc.red('Error: Port must be between 1 and 65535'));
    process.exit(1);
  }
  return port;
}, 3000)
```

### 予期しないエラー

```typescript
program.exitOverride((err) => {
  if (err.code === 'commander.missingMandatoryOptionValue') {
    console.error(pc.red('Error: Missing required option'));
    console.log(pc.yellow('\nUsage: tailwind-variables-viewer -c <css-file>'));
    console.log(pc.gray('Try: tailwind-variables-viewer --help'));
  }
  process.exit(1);
});
```

## ヘルプメッセージ

```typescript
program
  .addHelpText('after', `

Examples:
  $ tailwind-variables-viewer -c ./src/app.css
  $ tailwind-variables-viewer -c ./theme.css -p 3001 -o
  $ tailwind-variables-viewer -c ./base.css -c ./colors.css

For more information, visit:
  https://github.com/your-repo/tailwind-variables-viewer
`);
```

## Shebang設定

ファイルの先頭に必須:

```typescript
#!/usr/bin/env node
```

package.jsonのbin設定:

```json
{
  "bin": {
    "tailwind-variables-viewer": "./dist-cli/cli/index.js"
  }
}
```

## テストケース

- [ ] 引数なし（エラー表示）
- [ ] 有効なファイル指定
- [ ] 無効なファイル（エラー）
- [ ] 複数ファイル指定
- [ ] カスタムポート
- [ ] 不正なポート番号（エラー）
- [ ] ブラウザ自動起動
- [ ] ヘルプ表示
- [ ] バージョン表示
- [ ] Ctrl+Cでのgraceful shutdown

## 出力例

```
Checking CSS files...
Parsing CSS files...
✓ Found 47 theme variables
  - color (23)
  - spacing (12)
  - font (8)
  - breakpoint (4)

Starting server...

✓ Server started
→ http://localhost:3000
Press Ctrl+C to stop
```
