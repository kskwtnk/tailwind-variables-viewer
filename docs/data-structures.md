# データ構造仕様

プロジェクト全体で使用される主要なデータ構造をTypeScriptで定義します。
すべての型定義は `lib/types.ts` に集約します。

## @themeパーサー出力

### ThemeVariable

@themeブロックから抽出された単一の変数:

```typescript
interface ThemeVariable {
  name: string;       // '--color-brand-500'
  value: string;      // 'oklch(0.65 0.20 200)'
  namespace: string;  // 'color'
  isReset: boolean;   // '--*: initial' の場合 true
}
```

### ParsedTheme

@themeブロックの解析結果:

```typescript
interface ParsedTheme {
  filePath: string;
  hasReset: boolean;           // '--*: initial' が含まれるか
  hasImport: boolean;          // '@import "tailwindcss"' が含まれるか
  variables: ThemeVariable[];  // 抽出された変数
}
```

### 例

```javascript
{
  filePath: '/Users/user/project/src/app.css',
  hasReset: false,
  hasImport: true,
  variables: [
    {
      name: '--color-mint-500',
      value: 'oklch(0.72 0.11 178)',
      namespace: 'color',
      isReset: false
    },
    {
      name: '--font-sans',
      value: '"Inter", system-ui, sans-serif',
      namespace: 'font',
      isReset: false
    }
  ]
}
```

---

## 変数整理用の型

### Variable

整理処理で使用される変数:

```typescript
interface Variable {
  name: string;   // '--color-mint-500'
  value: string;  // 'oklch(0.72 0.11 178)'
  raw: string;    // '--color-mint-500: oklch(0.72 0.11 178);'
}
```

### RootBlock / ParsedCSS

整理処理の中間データ構造（内部使用）:

```typescript
interface RootBlock {
  variables: Variable[];
}

interface ParsedCSS {
  filePath: string;
  rootBlocks: RootBlock[];
}
```

---

## 整理後の変数

### OrganizedVariables

ネームスペース別に整理された変数:

```typescript
interface OrganizedVariables {
  [namespace: string]: OrganizedVariable[];
}
```

### OrganizedVariable

表示用に整理された変数:

```typescript
interface OrganizedVariable {
  name: string;            // 短縮名 'mint-500'
  varName: string;         // フルネーム '--color-mint-500'
  value: string;           // 'oklch(0.72 0.11 178)'
  resolvedValue?: string;  // var()参照を解決した値（オプショナル）
  type: VariableType;      // 'color' | 'size' | 'font' | 'reference' | 'other'
  namespace: string;       // 'color'
}
```

### VariableType

```typescript
type VariableType =
  | 'color'      // カラー値
  | 'size'       // サイズ値 (px, rem, em, etc)
  | 'font'       // フォント名
  | 'reference'  // var()参照
  | 'other';     // その他
```

### 例

```javascript
{
  color: [
    {
      name: 'mint-500',
      varName: '--color-mint-500',
      value: 'oklch(0.72 0.11 178)',
      type: 'color',
      namespace: 'color'
    },
    {
      name: 'mint-600',
      varName: '--color-mint-600',
      value: 'oklch(0.65 0.11 178)',
      type: 'color',
      namespace: 'color'
    }
  ],
  font: [
    {
      name: 'sans',
      varName: '--font-sans',
      value: '"Inter", system-ui, sans-serif',
      type: 'font',
      namespace: 'font'
    }
  ],
  spacing: [
    {
      name: '4',
      varName: '--spacing-4',
      value: '1rem',
      type: 'size',
      namespace: 'spacing'
    }
  ]
}
```

---

## ネームスペース

### KnownNamespaces

Tailwind v4の標準ネームスペース:

```typescript
const KNOWN_NAMESPACES = [
  'color',         // --color-*
  'font',          // --font-*
  'spacing',       // --spacing-*
  'breakpoint',    // --breakpoint-*
  'text',          // --text-*
  'radius',        // --radius-*
  'shadow',        // --shadow-*
  'animate',       // --animate-*
  'ease',          // --ease-*
  'inset-shadow',  // --inset-shadow-*
  'drop-shadow'    // --drop-shadow-*
] as const;

type Namespace = typeof KNOWN_NAMESPACES[number] | 'other';
```

---

## CLIオプション

### CLIOptions

コマンドライン引数:

```typescript
interface CLIOptions {
  config: string;  // 単一のCSSファイルパス
  port: number;    // ポート番号
  open: boolean;   // ブラウザ自動起動
}
```

### 例

```javascript
{
  config: './src/app.css',
  port: 3000,
  open: true
}
```

**注**: 現在の実装は単一ファイルのみサポート。複数ファイル対応は将来の拡張として検討中。

---

## サーバー設定

### ServerOptions

サーバー起動オプション:

```typescript
interface ServerOptions {
  port?: number;  // ポート番号 (デフォルト: 3000)
  host?: string;  // ホスト名 (デフォルト: 'localhost')
}
```

### ServerResult

サーバー起動結果:

```typescript
interface ServerResult {
  server: any;   // Vite preview server
  port: number;  // 実際に使用されたポート
  url: string;   // アクセスURL
}
```

### 例

```javascript
// Options
{
  port: 3000,
  host: 'localhost'
}

// Result
{
  server: PreviewServer { ... },
  port: 3000,
  url: 'http://localhost:3000'
}
```

---

## API レスポンス

### GET /api/variables

成功時:

```typescript
interface VariablesResponse extends OrganizedVariables {}
```

エラー時:

```typescript
interface ErrorResponse {
  error: string;  // エラーメッセージ
}
```

### 例

成功:
```json
{
  "color": [
    {
      "name": "mint-500",
      "varName": "--color-mint-500",
      "value": "oklch(0.72 0.11 178)",
      "type": "color",
      "namespace": "color"
    }
  ]
}
```

エラー:
```json
{
  "error": "No variables found"
}
```

---

## lib/types.ts の実装

```typescript
// lib/types.ts

// @themeパーサー関連
export interface ThemeVariable {
  name: string;       // --color-brand-500
  value: string;      // oklch(0.65 0.20 200)
  namespace: string;  // color
  isReset: boolean;   // --*: initial の場合 true
}

export interface ParsedTheme {
  filePath: string;
  hasReset: boolean;           // --*: initial が含まれるか
  hasImport: boolean;          // @import "tailwindcss" が含まれるか
  variables: ThemeVariable[];  // 抽出された変数
}

// 変数整理用の型
export interface Variable {
  name: string;
  value: string;
  raw: string;
}

export interface RootBlock {
  variables: Variable[];
}

export interface ParsedCSS {
  filePath: string;
  rootBlocks: RootBlock[];
}

// 整理後の変数
export type VariableType = 'color' | 'size' | 'font' | 'reference' | 'other';

export interface OrganizedVariable {
  name: string;
  varName: string;
  value: string;
  resolvedValue?: string;  // var()参照を解決した値（オプショナル）
  type: VariableType;
  namespace: string;
}

export interface OrganizedVariables {
  [namespace: string]: OrganizedVariable[];
}

// CLI関連
export interface CLIOptions {
  config: string;  // 単一のCSSファイルパス
  port: number;
  open: boolean;
}

// サーバー関連
export interface ServerOptions {
  port?: number;
  host?: string;
}

export interface ServerResult {
  server: any;  // Vite preview server
  port: number;
  url: string;
}

// API レスポンス
export interface VariablesResponse extends OrganizedVariables {}

export interface ErrorResponse {
  error: string;
}

// ネームスペース定数
export const KNOWN_NAMESPACES = [
  'color',
  'font',
  'spacing',
  'breakpoint',
  'text',
  'radius',
  'shadow',
  'animate',
  'ease',
  'inset-shadow',
  'drop-shadow',
] as const;

export type Namespace = typeof KNOWN_NAMESPACES[number] | 'other';
```
