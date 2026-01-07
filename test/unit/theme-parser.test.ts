import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseThemeVariables } from "../../src/core/theme-parser.js";

const FIXTURES_DIR = join(import.meta.dir, "../fixtures/scenarios");

describe("parseThemeVariables", () => {
	test('should detect @import "tailwindcss"', async () => {
		const result = await parseThemeVariables(
			join(FIXTURES_DIR, "1-default-only.css"),
			true,
		);

		expect(result.hasImport).toBe(true);
	});

	test("should detect reset pattern (--*: initial)", async () => {
		const result = await parseThemeVariables(
			join(FIXTURES_DIR, "2-reset-all.css"),
			true,
		);

		expect(result.hasReset).toBe(true);
	});

	test("should extract custom variables from @theme block", async () => {
		const result = await parseThemeVariables(
			join(FIXTURES_DIR, "3-extend-defaults.css"),
			false,
		);

		expect(result.variables.length).toBeGreaterThan(0);

		// カスタム変数が含まれているか確認
		const brandVar = result.variables.find(
			(v) => v.name === "--color-brand-500",
		);
		expect(brandVar).toBeDefined();
		expect(brandVar?.value).toBe("oklch(0.65 0.20 200)");
		expect(brandVar?.namespace).toBe("color");
	});

	test("should handle multiple custom variables", async () => {
		const result = await parseThemeVariables(
			join(FIXTURES_DIR, "4-reset-and-custom.css"),
			false,
		);

		// リセット後のカスタム変数
		expect(result.hasReset).toBe(true);
		expect(result.variables.length).toBe(6);

		// 各変数のネームスペースが正しいか確認
		const colorVars = result.variables.filter((v) => v.namespace === "color");
		const spacingVars = result.variables.filter(
			(v) => v.namespace === "spacing",
		);
		const fontVars = result.variables.filter((v) => v.namespace === "font");

		expect(colorVars.length).toBe(2);
		expect(spacingVars.length).toBe(3);
		expect(fontVars.length).toBe(1);
	});

	test("should parse file without @theme block", async () => {
		const result = await parseThemeVariables(
			join(FIXTURES_DIR, "1-default-only.css"),
			false,
		);

		// @themeブロックがない場合は空配列
		expect(result.variables.length).toBe(0);
		expect(result.hasReset).toBe(false);
	});
});
