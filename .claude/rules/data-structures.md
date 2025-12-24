# データ構造仕様

プロジェクト全体で使用される主要なデータ構造をTypeScriptで定義します。
すべての型定義は `lib/types.ts` に集約します。

## パーサー出力

### ParsedFile

単一CSSファイルの解析結果:

```typescript
interface ParsedFile {
  filePath: string;           // 絶対パス
  themeBlocks: ThemeBlock[];  // @themeブロックの配列
}
```

### ThemeBlock

単一の@themeブロック:

```typescript
interface ThemeBlock {
  variables: Variable[];  // CSS変数の配列
}
```

### Variable (Raw)

抽出直後の生のCSS変数:

```typescript
interface Variable {
  name: string;   // '--color-mint-500'
  value: string;  // 'oklch(0.72 0.11 178)'
  raw: string;    // '--color-mint-500: oklch(0.72 0.11 178);'
}
```

### 例

```javascript
{
  filePath: '/Users/user/project/src/app.css',
  themeBlocks: [
    {
      variables: [
        {
          name: '--color-mint-500',
          value: 'oklch(0.72 0.11 178)',
          raw: '--color-mint-500: oklch(0.72 0.11 178);'
        },
        {
          name: '--font-sans',
          value: '"Inter", system-ui, sans-serif',
          raw: '--font-sans: "Inter", system-ui, sans-serif;'
        }
      ]
    }
  ]
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
  name: string;       // 短縮名 'mint-500'
  varName: string;    // フルネーム '--color-mint-500'
  value: string;      // 'oklch(0.72 0.11 178)'
  type: VariableType; // 'color' | 'size' | 'font' | 'reference' | 'other'
  namespace: string;  // 'color'
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
  'color',          // --color-*
  'font',           // --font-*
  'spacing',        // --spacing-*
  'breakpoint',     // --breakpoint-*
  'text',           // --text-*
  'radius',         // --radius-*
  'shadow',         // --shadow-*
  'animate',        // --animate-*
  'ease',           // --ease-*
  'inset-shadow',   // --inset-shadow-*
  'drop-shadow'     // --drop-shadow-*
] as const;

type Namespace = typeof KNOWN_NAMESPACES[number] | 'other';
```

---

## CLIオプション

### CLIOptions

コマンドライン引数:

```typescript
interface CLIOptions {
  config: string[];   // CSSファイルパス配列
  port: number;       // ポート番号
  open: boolean;      // ブラウザ自動起動
}
```

### 例

```javascript
{
  config: ['./src/app.css', './src/theme.css'],
  port: 3000,
  open: true
}
```

---

## サーバー設定

### ServerOptions

サーバー起動オプション:

```typescript
interface ServerOptions {
  port: number;           // ポート番号
  host?: string;          // ホスト名 (デフォルト: 'localhost')
  mode?: 'dev' | 'prod';  // 実行モード
}
```

### ServerResult

サーバー起動結果:

```typescript
interface ServerResult {
  server: Server;  // Koaサーバーインスタンス
  port: number;    // 実際に使用されたポート
  url: string;     // アクセスURL
}
```

### 例

```javascript
// Options
{
  port: 3000,
  host: 'localhost',
  mode: 'prod'
}

// Result
{
  server: Server { ... },
  port: 3000,
  url: 'http://localhost:3000'
}
```

---

## API レスポンス

### GET /api/variables

成功時:

```typescript
interface VariablesResponse {
  [namespace: string]: OrganizedVariable[];
}
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

## フロントエンド状態

### AppState

アプリケーション状態:

```typescript
interface AppState {
  variables: OrganizedVariables | null;  // 変数データ
  loading: boolean;                      // ロード中
  error: string | null;                  // エラーメッセージ
  searchQuery: string;                   // 検索クエリ
}
```

### 例

```javascript
{
  variables: { color: [...], font: [...] },
  loading: false,
  error: null,
  searchQuery: 'mint'
}
```

---

## 統計情報

### Statistics

変数統計:

```typescript
interface Statistics {
  totalFiles: number;           // ファイル数
  totalBlocks: number;          // @themeブロック数
  totalVariables: number;       // 変数総数
  byNamespace: {                // ネームスペース別
    [namespace: string]: number;
  };
}
```

### 例

```javascript
{
  totalFiles: 2,
  totalBlocks: 3,
  totalVariables: 47,
  byNamespace: {
    color: 23,
    spacing: 12,
    font: 8,
    breakpoint: 4
  }
}
```

---

## バリデーション

### ValidationResult

ファイルバリデーション結果:

```typescript
interface ValidationResult {
  valid: boolean;       // 有効かどうか
  errors: string[];     // エラーメッセージ配列
  warnings: string[];   // 警告メッセージ配列
}
```

### 例

```javascript
{
  valid: false,
  errors: ['File not found: ./missing.css'],
  warnings: ['No @theme directives found in ./empty.css']
}
```

---

## lib/types.ts の実装例

```typescript
// lib/types.ts

// パーサー関連
export interface Variable {
  name: string;
  value: string;
  raw: string;
}

export interface ThemeBlock {
  variables: Variable[];
}

export interface ParsedFile {
  filePath: string;
  themeBlocks: ThemeBlock[];
}

// 整理後の変数
export type VariableType = 'color' | 'size' | 'font' | 'reference' | 'other';

export interface OrganizedVariable {
  name: string;
  varName: string;
  value: string;
  type: VariableType;
  namespace: string;
}

export interface OrganizedVariables {
  [namespace: string]: OrganizedVariable[];
}

// CLI関連
export interface CLIOptions {
  config: string[];
  port: number;
  open: boolean;
}

// サーバー関連
export interface ServerOptions {
  port?: number;
  host?: string;
}

export interface ServerResult {
  server: any; // Vite preview server
  port: number;
  url: string;
}

// API レスポンス
export interface VariablesResponse extends OrganizedVariables {}

export interface ErrorResponse {
  error: string;
}

// 統計情報
export interface Statistics {
  totalFiles: number;
  totalBlocks: number;
  totalVariables: number;
  byNamespace: Record<string, number>;
}

// バリデーション
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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
