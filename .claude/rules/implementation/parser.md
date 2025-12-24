---
paths:
  - "lib/parser.ts"
---

# CSSパーサー実装ガイド

## 責務

PostCSSを使用してCSSファイルをパースし、`@theme`ブロックからCSS変数を抽出する。

## データ構造

### 入力
```typescript
// CSSファイルパス（文字列）
'/path/to/app.css'
```

### 出力
```typescript
{
  filePath: '/path/to/app.css',
  themeBlocks: [
    {
      variables: [
        {
          name: '--color-mint-500',
          value: 'oklch(0.72 0.11 178)',
          raw: '--color-mint-500: oklch(0.72 0.11 178);'
        }
      ]
    }
  ]
}
```

## 主要機能

### 1. CSS解析
- PostCSSでCSSをAST化
- ファイル読み込みエラーのハンドリング
- 不正なCSS構文のgraceful degradation

### 2. @themeルール検出
- `root.walkAtRules('theme', callback)` を使用
- 複数の`@theme`ブロックに対応
- ネストされた`@theme`も処理

### 3. CSS変数抽出
- `--*`形式のカスタムプロパティを抽出
- `atRule.walkDecls(callback)` でプロパティ走査
- プロパティ名が`--`で始まるもののみ対象

### 4. 複数ファイル対応
- ファイル配列を受け取り、順次処理
- 各ファイルの結果を統合
- ファイル順序を保持（後のファイルが優先）

## 実装パターン

```typescript
import postcss from 'postcss';
import { readFile } from 'fs/promises';
import type { ParsedFile, ThemeBlock, Variable } from './types.js';

async function parseCSS(filePath: string): Promise<ParsedFile> {
  const css = await readFile(filePath, 'utf8');
  const root = postcss.parse(css);
  const themeBlocks: ThemeBlock[] = [];

  root.walkAtRules('theme', (atRule) => {
    const variables: Variable[] = [];
    atRule.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) {
        variables.push({
          name: decl.prop,
          value: decl.value,
          raw: decl.toString()
        });
      }
    });
    themeBlocks.push({ variables });
  });

  return { filePath, themeBlocks };
}

async function parseCSSFiles(filePaths: string[]): Promise<ParsedFile[]> {
  const results: ParsedFile[] = [];
  for (const path of filePaths) {
    try {
      const result = await parseCSS(path);
      results.push(result);
    } catch (error) {
      console.error(`Error parsing ${path}:`, (error as Error).message);
    }
  }
  return results;
}

export { parseCSS, parseCSSFiles };
```

## エラーハンドリング

### ファイル読み込みエラー
```typescript
try {
  const css = await readFile(filePath, 'utf8');
} catch (error) {
  throw new Error(`Failed to read CSS file: ${filePath}`);
}
```

### CSS構文エラー
```typescript
try {
  const root = postcss.parse(css);
} catch (error) {
  console.warn(`Invalid CSS syntax in ${filePath}, skipping...`);
  return { filePath, themeBlocks: [] };
}
```

## テストケース

必ず以下のケースを検証:

- [ ] 単一@themeブロック
- [ ] 複数@themeブロック
- [ ] 複数CSSファイル
- [ ] 空の@theme
- [ ] @themeなしのCSS（警告のみ）
- [ ] 不正なCSS（graceful degradation）
- [ ] CSSコメント処理
- [ ] 複雑な値（calc, var参照）

## パフォーマンス

- ファイル読み込みは非同期
- 大きなCSSファイルでもPostCSSは効率的
- 解析結果は一度だけ実行（キャッシュは呼び出し側で管理）
