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

## リセットパターン対応（ADR-003参照）

Tailwind CSS v4では、`@theme`ブロック内で`--*: initial;`を使用してリセットを指定できます。
これらのパターンは通常のCSS変数として解析されますが、CLI側で特別に処理されます。

### サポートされるリセットパターン

```css
@theme {
  /* グローバルリセット - すべての変数を除外 */
  --*: initial;

  /* ネームスペース別リセット - 特定のプレフィックス配下を除外 */
  --color-*: initial;     /* --color-* で始まる変数を除外 */
  --spacing-*: initial;   /* --spacing-* で始まる変数を除外 */

  /* 個別リセット - 特定の変数のみ除外 */
  --color-primary: initial;
}
```

### パーサー側での処理

パーサー自体は、`initial`値を持つ変数を通常と同じように抽出します：

```typescript
// パーサーの出力例
{
  name: '--color-*',
  value: 'initial',
  raw: '--color-*: initial;'
}
```

### CLI側での処理（cli/index.ts）

リセットパターンはCLI側の`applyResets()`関数で解釈されます：

```typescript
function applyResets(
  defaultVars: ThemeVariable[],
  userVars: ThemeVariable[]
): ThemeVariable[] {
  const resetPatterns = userVars
    .filter(v => v.value.trim() === 'initial')
    .map(v => v.name);

  if (resetPatterns.length === 0) {
    return defaultVars;
  }

  return defaultVars.filter(v => {
    return !resetPatterns.some(pattern => {
      if (pattern.endsWith('-*')) {
        // ワイルドカードパターン: --color-* → 全color変数を除外
        const prefix = pattern.slice(0, -2);
        return v.name.startsWith(prefix);
      }
      // 完全一致: --color-primary → その変数のみ除外
      return v.name === pattern;
    });
  });
}
```

### 実装例

```typescript
// デフォルト変数から 'initial' パターンを適用
const defaultVars = [
  { name: '--color-red-500', value: 'oklch(...)' },
  { name: '--color-blue-500', value: 'oklch(...)' },
  { name: '--spacing-4', value: '1rem' }
];

const userVars = [
  { name: '--color-*', value: 'initial' },  // すべてのcolor変数を除外
  { name: '--spacing-custom', value: '2rem' }
];

const result = applyResets(defaultVars, userVars);
// 結果: [ { name: '--spacing-4', value: '1rem' } ]
// (spacing-4は残る、colorはすべて除外、spacing-customは後でマージ)
```

## パフォーマンス

- ファイル読み込みは非同期
- 大きなCSSファイルでもPostCSSは効率的
- 解析結果は一度だけ実行（キャッシュは呼び出し側で管理）
- リセットパターンのマッチングはO(n*m)（nはデフォルト変数数、mはリセットパターン数）
  - 実際には十分高速（375変数 × 数パターン = 数ms）
