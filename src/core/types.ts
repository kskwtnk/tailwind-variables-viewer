// このファイルを編集した際は @docs/data-structures.md に齟齬が生まれていないか確認すること

// @themeパーサー関連
export interface ThemeVariable {
	name: string; // --color-brand-500
	value: string; // oklch(0.65 0.20 200)
	namespace: string; // color
	isReset: boolean; // --*: initial の場合 true
}

export interface ParsedTheme {
	filePath: string;
	hasReset: boolean; // --*: initial が含まれるか
	hasImport: boolean; // @import "tailwindcss" が含まれるか
	variables: ThemeVariable[]; // 抽出された変数
}

// 変数整理用の型
export interface Variable {
	name: string;
	value: string;
}

export interface ParsedCSS {
	filePath: string;
	variables: Variable[];
}

// 整理後の変数
export type VariableType =
	| "color"
	| "size"
	| "fontSize"
	| "fontFamily"
	| "reference"
	| "other";

export interface OrganizedVariable {
	name: string;
	varName: string;
	value: string;
	resolvedValue?: string; // var()参照を解決した値（オプショナル）
	type: VariableType;
	namespace: string;
}

export interface OrganizedVariables {
	[namespace: string]: OrganizedVariable[];
}

// ネームスペース定数
export const KNOWN_NAMESPACES = [
	"color",
	"font",
	"spacing",
	"breakpoint",
	"text",
	"radius",
	"shadow",
	"animate",
	"ease",
	"inset-shadow",
	"drop-shadow",
] as const;

export type Namespace = (typeof KNOWN_NAMESPACES)[number] | "other";

/**
 * 型ガード: 既知のネームスペースかどうか判定
 */
function isKnownNamespace(
	prefix: string,
): prefix is (typeof KNOWN_NAMESPACES)[number] {
	return (KNOWN_NAMESPACES as readonly string[]).includes(prefix);
}

/**
 * CSS変数名からネームスペースを検出
 * 例: --color-mint-500 → color
 */
export function detectNamespace(varName: string): string {
	const match = varName.match(/^--([^-]+)-/);
	if (!match) return "other";

	const prefix = match[1];
	return isKnownNamespace(prefix) ? prefix : "other";
}
