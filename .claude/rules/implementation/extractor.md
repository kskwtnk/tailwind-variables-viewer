---
paths:
  - "lib/extractor.ts"
---

# 変数抽出・整理実装ガイド

## 責務

パーサーから抽出した変数をネームスペースごとに分類し、表示用のデータ構造に変換する。

## データ構造

### 入力

parser.tsからの出力:

```typescript
{
  filePath: '/path/to/app.css',
  themeBlocks: [
    {
      variables: [
        {
          name: '--color-mint-500',
          value: 'oklch(0.72 0.11 178)',
          raw: '...'
        }
      ]
    }
  ]
}
```

### 出力

```typescript
{
  color: [
    {
      name: 'mint-500',              // 短縮名（プレフィックスなし）
      varName: '--color-mint-500',   // フルCSS変数名
      value: 'oklch(0.72 0.11 178)', // 値
      type: 'color',                 // タイプ
      namespace: 'color'             // ネームスペース
    }
  ],
  spacing: [...],
  font: [...]
}
```

## 主要機能

### 1. ネームスペース検出

Tailwind v4の命名規則に基づく:

- `--color-*` → `color`
- `--font-*` → `font`
- `--spacing-*` → `spacing`
- `--breakpoint-*` → `breakpoint`
- `--text-*` → `text`
- `--radius-*` → `radius`
- `--shadow-*` → `shadow`
- その他 → `other`

```typescript
function detectNamespace(varName: string): string {
  const match = varName.match(/^--([^-]+)-/);
  if (!match) return 'other';

  const prefix = match[1];
  const knownNamespaces = [
    'color', 'font', 'spacing', 'breakpoint',
    'text', 'radius', 'shadow', 'animate',
    'ease', 'inset-shadow', 'drop-shadow'
  ];

  return knownNamespaces.includes(prefix) ? prefix : 'other';
}
```

### 2. 変数タイプ判定

値から変数のタイプを推測:

```typescript
function detectType(value: string): VariableType {
  // カラー: oklch, rgb, hsl, hex
  if (/oklch|rgb|hsl|#[0-9a-f]{3,8}/i.test(value)) {
    return 'color';
  }

  // サイズ: px, rem, em, vh, vw, %
  if (/\d+(px|rem|em|vh|vw|%)/.test(value)) {
    return 'size';
  }

  // フォント: 引用符で囲まれた文字列
  if (/["'].*["']/.test(value)) {
    return 'font';
  }

  // 変数参照: var(--*)
  if (/var\(--/.test(value)) {
    return 'reference';
  }

  return 'other';
}
```

### 3. 短縮名抽出

CSS変数名からプレフィックスを除去:

```typescript
function extractShortName(varName: string, namespace: string): string {
  // --color-mint-500 → mint-500
  const prefix = `--${namespace}-`;
  return varName.startsWith(prefix)
    ? varName.slice(prefix.length)
    : varName;
}
```

### 4. ソート処理

ネームスペースごとに適切にソート:

```typescript
function sortVariables(variables: OrganizedVariable[], namespace: string): OrganizedVariable[] {
  if (namespace === 'spacing') {
    // スペーシング: 数値でソート
    return variables.sort((a, b) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });
  }

  // デフォルト: アルファベット順
  return variables.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
```

## 実装パターン

```typescript
import type { ParsedFile, OrganizedVariables, OrganizedVariable, VariableType } from './types.js';

function organizeVariables(parsedResults: ParsedFile[]): OrganizedVariables {
  const organized: OrganizedVariables = {};

  // 全ファイル・全ブロックから変数を収集
  for (const result of parsedResults) {
    for (const block of result.themeBlocks) {
      for (const variable of block.variables) {
        const namespace = detectNamespace(variable.name);
        const type = detectType(variable.value);
        const shortName = extractShortName(variable.name, namespace);

        if (!organized[namespace]) {
          organized[namespace] = [];
        }

        organized[namespace].push({
          name: shortName,
          varName: variable.name,
          value: variable.value,
          type,
          namespace
        });
      }
    }
  }

  // 各ネームスペースをソート
  for (const namespace in organized) {
    organized[namespace] = sortVariables(
      organized[namespace],
      namespace
    );
  }

  return organized;
}

export { organizeVariables };
```

## 重複処理

同じ変数名が複数ファイルに存在する場合:

- 後のファイルの値で上書き（CSSカスケードと同じ）
- 警告をコンソールに出力（オプション）

```typescript
// 重複チェック（オプション機能）
const seen = new Set<string>();
if (seen.has(variable.name)) {
  console.warn(`Duplicate variable: ${variable.name}`);
}
seen.add(variable.name);
```

## テストケース

- [ ] 各ネームスペースの検出
- [ ] カスタムネームスペース（`other`に分類）
- [ ] 各タイプの判定
- [ ] 短縮名抽出
- [ ] ソート順序（spacing、その他）
- [ ] 複数ファイルでの重複
- [ ] 空の入力

## パフォーマンス

- O(n)の線形処理
- ネームスペースごとのソートのみO(n log n)
- 大量の変数（数百個）でも高速
