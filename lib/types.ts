// lib/types.ts

// @themeパーサー関連
export interface ThemeVariable {
  name: string;        // --color-brand-500
  value: string;       // oklch(0.65 0.20 200)
  namespace: string;   // color
  isReset: boolean;    // --*: initial の場合 true
}

export interface ParsedTheme {
  filePath: string;
  hasReset: boolean;         // --*: initial が含まれるか
  variables: ThemeVariable[]; // 抽出された変数
}

// :rootパーサー関連（ビルド後のCSS）
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
  type: VariableType;
  namespace: string;
}

export interface OrganizedVariables {
  [namespace: string]: OrganizedVariable[];
}

// HTML生成関連
export interface GeneratedHTML {
  html: string;          // 生成されたHTML文字列
  cssPath: string;       // 元のCSSファイルパス
  variableCount: number; // 含まれる変数の数
}

// ビルド関連
export interface BuildOptions {
  htmlPath: string;      // 入力HTMLファイル
  cssPath: string;       // 出力CSSファイル
  timeout?: number;      // タイムアウト（ミリ秒）
}

export interface BuildResult {
  success: boolean;
  cssPath: string;       // 生成されたCSSのパス
  output: string;        // CLIの出力
  error?: string;        // エラーメッセージ
}

// CLI関連
export interface CLIOptions {
  config: string;        // 単一のCSSファイルパス
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
