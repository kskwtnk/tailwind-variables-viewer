import { readFile } from "node:fs/promises";
import postcss from "postcss";
import type { ParsedTheme, ThemeVariable } from "./types.js";
import { detectNamespace } from "./types.js";

/**
 * @themeディレクティブからCSS変数を抽出
 *
 * @param filePath - パースするCSSファイルのパス
 * @param checkImport - @import "tailwindcss" をチェックするか（デフォルト: true）
 */
export async function parseThemeVariables(
	filePath: string,
	checkImport = true,
): Promise<ParsedTheme> {
	const css = await readFile(filePath, "utf8");
	const root = postcss.parse(css);

	let hasReset = false;
	let hasImport = false;
	const variables: ThemeVariable[] = [];

	// @import "tailwindcss" をチェック
	if (checkImport) {
		root.walkAtRules("import", (atRule) => {
			const importValue = atRule.params.replace(/["']/g, "");
			if (importValue === "tailwindcss") {
				hasImport = true;
			}
		});
	}

	// @themeルールを探索（@theme と @theme default の両方）
	root.walkAtRules("theme", (atRule) => {
		atRule.walkDecls((decl) => {
			// --*: initial; の検出（リセット）
			if (decl.prop === "--*" && decl.value.trim() === "initial") {
				hasReset = true;
				return;
			}

			// CSS変数（--で始まるプロパティ）のみ抽出
			if (decl.prop.startsWith("--")) {
				const namespace = detectNamespace(decl.prop);

				variables.push({
					isReset: false,
					name: decl.prop,
					namespace,
					value: decl.value,
				});
			}
		});
	});

	return {
		filePath,
		hasImport,
		hasReset,
		variables,
	};
}
