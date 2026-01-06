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
  hasReset: boolean;          // --*: initial が含まれるか
  hasImport: boolean;         // @import "tailwindcss" が含まれるか
  variables: ThemeVariable[]; // 抽出された変数
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
  type: VariableType;
  namespace: string;
}

export interface OrganizedVariables {
  [namespace: string]: OrganizedVariable[];
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
