// lib/extractor.ts

import type {
	OrganizedVariable,
	OrganizedVariables,
	ParsedCSS,
	VariableType,
} from "./types.js";
import { detectNamespace } from "./types.js";

/**
 * 値から変数のタイプを推測
 */
function detectType(value: string): VariableType {
	// カラー: oklch, rgb, hsl, hex
	if (/oklch|rgb|hsl|#[0-9a-f]{3,8}/i.test(value)) {
		return "color";
	}

	// サイズ: px, rem, em, vh, vw, %
	if (/\d+(px|rem|em|vh|vw|%)/.test(value)) {
		return "size";
	}

	// フォント: 引用符で囲まれた文字列
	if (/["'].*["']/.test(value)) {
		return "font";
	}

	// 変数参照: var(--*)
	if (/var\(--/.test(value)) {
		return "reference";
	}

	return "other";
}

/**
 * CSS変数名からプレフィックスを除去して短縮名を取得
 * 例: --color-mint-500 → mint-500
 */
function extractShortName(varName: string, namespace: string): string {
	const prefix = `--${namespace}-`;
	return varName.startsWith(prefix)
		? varName.slice(prefix.length)
		: varName.slice(2); // --を除去
}

/**
 * var(--variable-name)から変数名を抽出
 */
function extractVarReference(value: string): string | null {
	const match = value.match(/var\((--[^,)]+)/);
	return match ? match[1] : null;
}

/**
 * 変数参照を解決
 * @param value - 解決する値（var(--color-blue-500)など）
 * @param variableMap - 変数名 → 値のマップ
 * @param visited - 循環参照チェック用
 * @param maxDepth - 最大解決深度
 */
function resolveReference(
	value: string,
	variableMap: Map<string, string>,
	visited: Set<string> = new Set(),
	maxDepth: number = 10,
): string | null {
	if (maxDepth === 0) return null; // 深すぎる参照

	const refVarName = extractVarReference(value);
	if (!refVarName) return null; // 参照ではない

	if (visited.has(refVarName)) return null; // 循環参照
	visited.add(refVarName);

	const refValue = variableMap.get(refVarName);
	if (!refValue) return null; // 参照先が見つからない

	// 参照先がさらに参照の場合は再帰的に解決
	if (/var\(--/.test(refValue)) {
		return resolveReference(refValue, variableMap, visited, maxDepth - 1);
	}

	return refValue;
}

/**
 * 変数リストをソート
 * color: 色名でグループ化 → 数値順（theme.cssの定義順を維持）
 * spacing: 数値順
 * その他: アルファベット順
 */
function sortVariables(
	variables: OrganizedVariable[],
	namespace: string,
): OrganizedVariable[] {
	if (namespace === "color") {
		// カラー: 色名グループ内のみ数値順にソート、色名間の順序は維持
		return variables.sort((a, b) => {
			// 色名部分を抽出（例: "red-500" → "red"）
			const aColorName = a.name.replace(/-\d+$/, "");
			const bColorName = b.name.replace(/-\d+$/, "");

			// 同じ色名の場合のみ数値でソート
			if (aColorName === bColorName) {
				const aNum = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
				const bNum = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
				return aNum - bNum;
			}

			// 異なる色名の場合は元の順序を維持（安定ソート）
			return 0;
		});
	}

	if (namespace === "spacing") {
		// スペーシング: 数値でソート
		return variables.sort((a, b) => {
			const aNum = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
			const bNum = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
			return aNum - bNum;
		});
	}

	// デフォルト: アルファベット順
	return variables.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * パース結果から変数を抽出・整理
 */
function organizeVariables(parsedResults: ParsedCSS[]): OrganizedVariables {
	const variableMap = new Map<string, string>();
	const organizedMap = new Map<string, Map<string, OrganizedVariable>>();

	// 全変数を1回のループで処理
	for (const result of parsedResults) {
		for (const variable of result.variables) {
			// 変数マップに追加（参照解決用）
			variableMap.set(variable.name, variable.value);

			const namespace = detectNamespace(variable.name);
			const shortName = extractShortName(variable.name, namespace);

			// ネームスペース別のマップを初期化
			if (!organizedMap.has(namespace)) {
				organizedMap.set(namespace, new Map());
			}

			// 参照を解決（後で一括処理する方が効率的だが、ここでは簡単のため都度処理）
			let resolvedValue: string | undefined;
			if (/var\(--/.test(variable.value)) {
				const resolved = resolveReference(variable.value, variableMap);
				if (resolved) {
					resolvedValue = resolved;
				}
			}

			// 実際の値（解決済みまたは元の値）でタイプ判定
			const valueForType = resolvedValue || variable.value;
			const type = detectType(valueForType);

			const organizedVar: OrganizedVariable = {
				name: shortName,
				namespace,
				resolvedValue,
				type,
				value: variable.value,
				varName: variable.name,
			};

			// Mapで管理（重複は自動的に上書き）
			const namespaceMap = organizedMap.get(namespace);
			if (namespaceMap) {
				namespaceMap.set(variable.name, organizedVar);
			}
		}
	}

	// MapをOrganizedVariables形式に変換してソート
	const organized: OrganizedVariables = {};
	for (const [namespace, varsMap] of organizedMap) {
		organized[namespace] = sortVariables(
			Array.from(varsMap.values()),
			namespace,
		);
	}

	return organized;
}

export { organizeVariables };
